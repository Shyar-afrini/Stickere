import ExpoModulesCore
import CoreImage
import UIKit
import Vision

private let stickerSide: CGFloat = 512
private let traySide: CGFloat = 96
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
          "image_data": try Self.render(sticker.uri, side: stickerSide).base64EncodedString(),
          "emojis": sticker.emojis,
          "accessibility_text": "",
        ])
      }

      let json: [String: Any] = [
        "identifier": pack.identifier,
        "name": pack.name,
        "publisher": pack.publisher,
        "tray_image": tray.base64EncodedString(),
        "stickers": stickers,
      ]
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
