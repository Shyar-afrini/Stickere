import ExpoModulesCore
import CoreImage
import libwebp
import ImageIO
import UIKit
import Vision

private let stickerSide: CGFloat = 512
private let traySide: CGFloat = 96
private let maxStickerBytes = 100 * 1024
// WhatsApp's limits for animated stickers.
private let maxAnimatedBytes = 500 * 1024
private let maxAnimatedMilliseconds = 10_000
private let minFrameMilliseconds = 8
private let whatsAppType = "net.whatsapp.third-party.sticker-pack"
private let telegramType = "org.telegram.third-party.stickerset"
private let pasteboardLifetime: TimeInterval = 60

struct StickerRecord: Record {
  @Field var uri: String
  @Field var emojis: [String] = []
}

struct WhatsAppPackRecord: Record {
  @Field var identifier: String
  @Field var name: String
  @Field var publisher: String
  @Field var trayUri: String
  @Field var stickers: [StickerRecord]
  /// Every sticker is a GIF. WhatsApp wants a pack to be all animated or all still.
  @Field var animated: Bool = false
}

struct TelegramPackRecord: Record {
  @Field var stickers: [StickerRecord]
}

final class AppNotInstalledException: GenericException<String> {
  override var reason: String {
    "\(param) is not installed on this device."
  }
}

struct MakeStickerOptions: Record {
  @Field var outline: Bool = true
}

final class NoSubjectException: Exception {
  override var reason: String {
    "No subject was found in this photo."
  }
}

final class UnsupportedDeviceException: Exception {
  override var reason: String {
    "Removing backgrounds needs iOS 17 or later on a physical device."
  }
}

final class StickerImageException: GenericException<String> {
  override var reason: String {
    "Could not read or encode the sticker image at \(param)."
  }
}

public final class StickerKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StickerKit")

    AsyncFunction("isInstalled") { (app: String) -> Bool in
      guard let scheme = Self.scheme(for: app) else { return false }
      return await MainActor.run {
        UIApplication.shared.canOpenURL(URL(string: "\(scheme)://")!)
      }
    }

    AsyncFunction("makeSticker") { (uri: String, options: MakeStickerOptions) -> [String: Any] in
      try Self.makeSticker(uri: uri, outline: options.outline)
    }

    AsyncFunction("shareToWhatsApp") { (pack: WhatsAppPackRecord) in
      guard await Self.canOpen("whatsapp://") else {
        throw AppNotInstalledException("WhatsApp")
      }

      let tray = try Self.render(pack.trayUri, side: traySide)
      var stickers: [[String: Any]] = []
      for sticker in pack.stickers {
        stickers.append([
          "image_data": try (pack.animated
            ? Self.renderAnimatedWebP(sticker.uri, side: stickerSide, maxBytes: maxAnimatedBytes)
            : Self.renderWebP(sticker.uri, side: stickerSide, maxBytes: maxStickerBytes))
            .base64EncodedString(),
          "emojis": sticker.emojis,
          "accessibility_text": "",
        ])
      }

      var json: [String: Any] = [
        "identifier": pack.identifier,
        "name": pack.name,
        "publisher": pack.publisher,
        "tray_image": tray.base64EncodedString(),
        "stickers": stickers,
      ]
      if pack.animated {
        json["animated_sticker_pack"] = true
      }
      try await Self.send(json, type: whatsAppType, to: "whatsapp://stickerPack")
    }

    AsyncFunction("shareToTelegram") { (pack: TelegramPackRecord) in
      guard await Self.canOpen("tg://") else {
        throw AppNotInstalledException("Telegram")
      }

      var stickers: [[String: Any]] = []
      for sticker in pack.stickers {
        stickers.append([
          "data": try Self.render(sticker.uri, side: stickerSide).base64EncodedString(),
          "mimeType": "image/png",
          "emojis": sticker.emojis,
        ])
      }

      let json: [String: Any] = [
        "software": "Stickere",
        "isAnimated": false,
        "isVideo": false,
        "stickers": stickers,
      ]
      try await Self.send(json, type: telegramType, to: "tg://importStickers")
    }
  }

  private static func scheme(for app: String) -> String? {
    switch app {
    case "whatsapp": return "whatsapp"
    case "telegram": return "tg"
    default: return nil
    }
  }

  @MainActor
  private static func canOpen(_ url: String) -> Bool {
    UIApplication.shared.canOpenURL(URL(string: url)!)
  }

  /// Puts the payload on the pasteboard (local only, short-lived) and opens the target app.
  @MainActor
  private static func send(_ json: [String: Any], type: String, to url: String) throws {
    let data = try JSONSerialization.data(withJSONObject: json, options: [])
    UIPasteboard.general.setItems(
      [[type: data]],
      options: [
        .localOnly: true,
        .expirationDate: Date(timeIntervalSinceNow: pasteboardLifetime),
      ]
    )
    UIApplication.shared.open(URL(string: url)!)
  }

  /// Fits the image inside a transparent square canvas, preserving aspect ratio, and encodes it as PNG.
  private static func render(_ uri: String, side: CGFloat) throws -> Data {
    guard let url = URL(string: uri), let source = UIImage(contentsOfFile: url.path) else {
      throw StickerImageException(uri)
    }

    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = false
    let size = CGSize(width: side, height: side)
    let scale = min(side / source.size.width, side / source.size.height)
    let drawn = CGSize(width: source.size.width * scale, height: source.size.height * scale)
    let origin = CGPoint(x: (side - drawn.width) / 2, y: (side - drawn.height) / 2)

    let data = UIGraphicsImageRenderer(size: size, format: format).pngData { _ in
      source.draw(in: CGRect(origin: origin, size: drawn))
    }
    guard !data.isEmpty else { throw StickerImageException(uri) }
    return data
  }

  /// A square WebP with transparency, as WhatsApp requires: exactly `side` points wide and high and no
  /// larger than `maxBytes`, so the quality is lowered until it fits.
  private static func renderWebP(_ uri: String, side: CGFloat, maxBytes: Int) throws -> Data {
    guard let url = URL(string: uri), let source = UIImage(contentsOfFile: url.path)?.normalized(),
      let cgImage = source.cgImage
    else {
      throw StickerImageException(uri)
    }

    let pixels = Int(side)
    let bytesPerRow = pixels * 4
    var buffer = [UInt8](repeating: 0, count: bytesPerRow * pixels)
    let scale = min(side / CGFloat(cgImage.width), side / CGFloat(cgImage.height))
    let drawn = CGSize(width: CGFloat(cgImage.width) * scale, height: CGFloat(cgImage.height) * scale)
    let rect = CGRect(x: (side - drawn.width) / 2, y: (side - drawn.height) / 2, width: drawn.width, height: drawn.height)

    let drew = buffer.withUnsafeMutableBytes { bytes -> Bool in
      guard
        let context = CGContext(
          data: bytes.baseAddress, width: pixels, height: pixels, bitsPerComponent: 8,
          bytesPerRow: bytesPerRow, space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
      else { return false }
      context.interpolationQuality = .high
      context.draw(cgImage, in: rect)
      return true
    }
    guard drew else { throw StickerImageException(uri) }

    // The encoder wants straight (non-premultiplied) alpha.
    for index in stride(from: 0, to: buffer.count, by: 4) {
      let alpha = Int(buffer[index + 3])
      guard alpha > 0, alpha < 255 else { continue }
      for channel in 0..<3 {
        buffer[index + channel] = UInt8(min(255, Int(buffer[index + channel]) * 255 / alpha))
      }
    }

    var quality: Float = 90
    while true {
      var output: UnsafeMutablePointer<UInt8>?
      let size = buffer.withUnsafeBufferPointer {
        WebPEncodeRGBA($0.baseAddress, Int32(pixels), Int32(pixels), Int32(bytesPerRow), quality, &output)
      }
      guard size > 0, let output else { throw StickerImageException(uri) }
      let data = Data(bytes: output, count: size)
      WebPFree(output)
      if data.count <= maxBytes { return data }
      if quality <= 20 { throw StickerImageException(uri) }
      quality -= 10
    }
  }

  /// An animated WebP from a GIF, as WhatsApp requires: 512×512, at most 10 seconds, no frame shorter than
  /// 8 ms and no larger than `maxBytes`. When it is too big, the quality drops first and then every
  /// other frame is left out (the remaining ones last twice as long).
  private static func renderAnimatedWebP(_ uri: String, side: CGFloat, maxBytes: Int) throws -> Data {
    guard let url = URL(string: uri), let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
      throw StickerImageException(uri)
    }

    let pixels = Int(side)
    var frames: [(pixels: [UInt8], milliseconds: Int)] = []
    var total = 0
    for index in 0..<CGImageSourceGetCount(source) {
      guard let image = CGImageSourceCreateImageAtIndex(source, index, nil) else { continue }
      let milliseconds = frameDelay(source, index)
      if total + milliseconds > maxAnimatedMilliseconds { break }
      total += milliseconds
      frames.append((try rgbaPixels(image, side: pixels, uri: uri), milliseconds))
    }
    guard !frames.isEmpty else { throw StickerImageException(uri) }

    while true {
      var quality: Float = 80
      while quality >= 30 {
        let data = try encodeAnimation(frames, pixels: pixels, quality: quality, uri: uri)
        if data.count <= maxBytes { return data }
        quality -= 15
      }
      guard frames.count > 2 else { throw StickerImageException(uri) }
      frames = stride(from: 0, to: frames.count, by: 2).map { index in
        let next = index + 1 < frames.count ? frames[index + 1].milliseconds : 0
        return (frames[index].pixels, frames[index].milliseconds + next)
      }
    }
  }

  /// How long a GIF frame is shown. Zero and 10 ms mean "as fast as possible", which viewers show as 100 ms.
  private static func frameDelay(_ source: CGImageSource, _ index: Int) -> Int {
    let properties = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any]
    let gif = properties?[kCGImagePropertyGIFDictionary] as? [CFString: Any]
    let seconds =
      (gif?[kCGImagePropertyGIFUnclampedDelayTime] as? Double)
      ?? (gif?[kCGImagePropertyGIFDelayTime] as? Double) ?? 0.1
    return seconds <= 0.01 ? 100 : max(minFrameMilliseconds, Int(seconds * 1000))
  }

  /// Straight-alpha RGBA pixels of the image, fitted inside a transparent square.
  private static func rgbaPixels(_ image: CGImage, side pixels: Int, uri: String) throws -> [UInt8] {
    let side = CGFloat(pixels)
    let bytesPerRow = pixels * 4
    var buffer = [UInt8](repeating: 0, count: bytesPerRow * pixels)
    let scale = min(side / CGFloat(image.width), side / CGFloat(image.height))
    let drawn = CGSize(width: CGFloat(image.width) * scale, height: CGFloat(image.height) * scale)
    let rect = CGRect(x: (side - drawn.width) / 2, y: (side - drawn.height) / 2, width: drawn.width, height: drawn.height)

    let drew = buffer.withUnsafeMutableBytes { bytes -> Bool in
      guard
        let context = CGContext(
          data: bytes.baseAddress, width: pixels, height: pixels, bitsPerComponent: 8,
          bytesPerRow: bytesPerRow, space: CGColorSpaceCreateDeviceRGB(),
          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
      else { return false }
      context.interpolationQuality = .high
      context.draw(image, in: rect)
      return true
    }
    guard drew else { throw StickerImageException(uri) }

    for index in stride(from: 0, to: buffer.count, by: 4) {
      let alpha = Int(buffer[index + 3])
      guard alpha > 0, alpha < 255 else { continue }
      for channel in 0..<3 {
        buffer[index + channel] = UInt8(min(255, Int(buffer[index + channel]) * 255 / alpha))
      }
    }
    return buffer
  }

  private static func encodeAnimation(
    _ frames: [(pixels: [UInt8], milliseconds: Int)], pixels: Int, quality: Float, uri: String
  ) throws -> Data {
    var options = WebPAnimEncoderOptions()
    var config = WebPConfig()
    guard WebPAnimEncoderOptionsInit(&options) != 0, WebPConfigInit(&config) != 0 else {
      throw StickerImageException(uri)
    }
    config.quality = quality
    config.method = 3
    guard let encoder = WebPAnimEncoderNew(Int32(pixels), Int32(pixels), &options) else {
      throw StickerImageException(uri)
    }
    defer { WebPAnimEncoderDelete(encoder) }

    var timestamp: Int32 = 0
    for frame in frames {
      var picture = WebPPicture()
      guard WebPPictureInit(&picture) != 0 else { throw StickerImageException(uri) }
      picture.use_argb = 1
      picture.width = Int32(pixels)
      picture.height = Int32(pixels)
      defer { WebPPictureFree(&picture) }

      let imported = frame.pixels.withUnsafeBufferPointer {
        WebPPictureImportRGBA(&picture, $0.baseAddress, Int32(pixels * 4))
      }
      guard imported != 0, WebPAnimEncoderAdd(encoder, &picture, timestamp, &config) != 0 else {
        throw StickerImageException(uri)
      }
      timestamp += Int32(frame.milliseconds)
    }
    // A last, empty frame tells the encoder where the final one ends.
    guard WebPAnimEncoderAdd(encoder, nil, timestamp, nil) != 0 else { throw StickerImageException(uri) }

    var output = WebPData()
    WebPDataInit(&output)
    defer { WebPDataClear(&output) }
    guard WebPAnimEncoderAssemble(encoder, &output) != 0, let bytes = output.bytes else {
      throw StickerImageException(uri)
    }
    return Data(bytes: bytes, count: output.size)
  }

  /// Lifts the foreground subject (Vision), crops to it, and optionally adds a white die-cut border.
  private static func makeSticker(uri: String, outline: Bool) throws -> [String: Any] {
    guard #available(iOS 17.0, *) else { throw UnsupportedDeviceException() }
    guard let url = URL(string: uri), let input = UIImage(contentsOfFile: url.path),
      let cgImage = input.normalized().cgImage
    else {
      throw StickerImageException(uri)
    }

    let request = VNGenerateForegroundInstanceMaskRequest()
    let handler = VNImageRequestHandler(cgImage: cgImage)
    do {
      try handler.perform([request])
    } catch {
      throw UnsupportedDeviceException()
    }
    guard let result = request.results?.first, !result.allInstances.isEmpty else {
      throw NoSubjectException()
    }

    let buffer = try result.generateMaskedImage(
      ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: true)
    var image = CIImage(cvPixelBuffer: buffer)
    image = image.transformed(by: CGAffineTransform(translationX: -image.extent.minX, y: -image.extent.minY))

    if outline {
      let radius = max(image.extent.width, image.extent.height) * 0.025
      let pad = radius * 2
      let padded = image.transformed(by: CGAffineTransform(translationX: pad, y: pad))
      let dilated = padded.applyingFilter("CIMorphologyMaximum", parameters: [kCIInputRadiusKey: radius])
      let white = dilated.applyingFilter(
        "CIColorMatrix",
        parameters: [
          "inputRVector": CIVector(x: 0, y: 0, z: 0, w: 0),
          "inputGVector": CIVector(x: 0, y: 0, z: 0, w: 0),
          "inputBVector": CIVector(x: 0, y: 0, z: 0, w: 0),
          "inputBiasVector": CIVector(x: 1, y: 1, z: 1, w: 0),
        ])
      let softened = white.applyingGaussianBlur(sigma: 1.2)
      image = padded.composited(over: softened)
    }

    let extent = image.extent.integral
    let context = CIContext()
    guard let output = context.createCGImage(image, from: extent),
      let data = UIImage(cgImage: output).pngData()
    else {
      throw StickerImageException(uri)
    }

    let file = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("sticker-\(UUID().uuidString).png")
    try data.write(to: file)
    return ["uri": file.absoluteString, "width": Int(extent.width), "height": Int(extent.height)]
  }
}

private extension UIImage {
  /// Bakes the EXIF orientation into the pixels so Vision and Core Image see an upright image.
  func normalized() -> UIImage {
    guard imageOrientation != .up else { return self }
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    return UIGraphicsImageRenderer(size: size, format: format).image { _ in draw(at: .zero) }
  }
}
