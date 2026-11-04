package expo.modules.stickerkit

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.os.Build
import java.io.File
import java.io.FileOutputStream

internal const val STICKER_SIDE = 512
internal const val TRAY_SIDE = 96
internal const val MAX_STICKER_BYTES = 100 * 1024
internal const val MAX_TRAY_BYTES = 50 * 1024

internal class StickerImageException(path: String) :
  Exception("Could not read or encode the sticker image at $path.")

/** Fits the image inside a transparent square canvas, preserving its aspect ratio. */
internal fun renderSquare(path: String, side: Int): Bitmap {
  val source = BitmapFactory.decodeFile(path) ?: throw StickerImageException(path)
  val scale = minOf(side.toFloat() / source.width, side.toFloat() / source.height)
  val width = (source.width * scale).toInt().coerceAtLeast(1)
  val height = (source.height * scale).toInt().coerceAtLeast(1)
  val scaled = Bitmap.createScaledBitmap(source, width, height, true)
  val canvasBitmap = Bitmap.createBitmap(side, side, Bitmap.Config.ARGB_8888)
  Canvas(canvasBitmap).drawBitmap(scaled, (side - width) / 2f, (side - height) / 2f, null)
  return canvasBitmap
}

@Suppress("DEPRECATION")
private val webp: Bitmap.CompressFormat
  get() = if (Build.VERSION.SDK_INT >= 30) Bitmap.CompressFormat.WEBP_LOSSY else Bitmap.CompressFormat.WEBP

/** Writes a WebP, lowering the quality until it fits within [maxBytes]. */
internal fun writeWebp(bitmap: Bitmap, target: File, maxBytes: Int) {
  var quality = 90
  while (true) {
    FileOutputStream(target).use { bitmap.compress(webp, quality, it) }
    if (target.length() <= maxBytes || quality <= 20) break
    quality -= 10
  }
  if (target.length() > maxBytes) throw StickerImageException(target.name)
}

internal fun writePng(bitmap: Bitmap, target: File) {
  FileOutputStream(target).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
}

internal fun uriToPath(uri: String): String = android.net.Uri.parse(uri).path ?: uri
