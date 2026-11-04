package expo.modules.stickerkit

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffColorFilter
import androidx.exifinterface.media.ExifInterface
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.subject.SubjectSegmentation
import com.google.mlkit.vision.segmentation.subject.SubjectSegmenterOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import java.io.File
import java.util.UUID
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.sin

private const val OUTLINE_STEPS = 32
private const val MAX_INPUT_SIDE = 2048

/** Lifts the foreground subject with ML Kit, crops to it, and optionally adds a white die-cut border. */
internal fun cutOutSubject(context: Context, path: String, outline: Boolean, promise: Promise) {
  val source = try {
    loadUpright(path)
  } catch (error: Exception) {
    promise.reject(CodedException("ERR_STICKER_IMAGE", "Could not read the image at $path.", error))
    return
  }

  val segmenter = SubjectSegmentation.getClient(
    SubjectSegmenterOptions.Builder().enableForegroundBitmap().build()
  )
  segmenter.process(InputImage.fromBitmap(source, 0))
    .addOnSuccessListener { result ->
      val foreground = result.foregroundBitmap
      if (foreground == null) {
        promise.reject(CodedException("ERR_NO_SUBJECT", "No subject was found in this photo.", null))
        return@addOnSuccessListener
      }
      try {
        val bitmap = crop(foreground).let { if (outline) addOutline(it) else it }
        val file = File(context.cacheDir, "sticker-${UUID.randomUUID()}.png")
        writePng(bitmap, file)
        promise.resolve(mapOf("uri" to "file://${file.absolutePath}", "width" to bitmap.width, "height" to bitmap.height))
      } catch (error: Exception) {
        promise.reject(CodedException("ERR_STICKER_IMAGE", "Could not encode the sticker.", error))
      }
    }
    .addOnFailureListener { error ->
      promise.reject(
        CodedException("ERR_SEGMENTATION", "Background removal failed. The model may still be downloading; try again in a moment.", error)
      )
    }
}

private fun loadUpright(path: String): Bitmap {
  val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
  BitmapFactory.decodeFile(path, bounds)
  var sample = 1
  while (max(bounds.outWidth, bounds.outHeight) / sample > MAX_INPUT_SIDE) sample *= 2

  val bitmap = BitmapFactory.decodeFile(path, BitmapFactory.Options().apply { inSampleSize = sample })
    ?: throw IllegalArgumentException(path)
  val degrees = when (ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
    ExifInterface.ORIENTATION_ROTATE_90 -> 90f
    ExifInterface.ORIENTATION_ROTATE_180 -> 180f
    ExifInterface.ORIENTATION_ROTATE_270 -> 270f
    else -> 0f
  }
  if (degrees == 0f) return bitmap
  val matrix = android.graphics.Matrix().apply { postRotate(degrees) }
  return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
}

/** Crops to the bounding box of non-transparent pixels. */
private fun crop(bitmap: Bitmap): Bitmap {
  val width = bitmap.width
  val height = bitmap.height
  val pixels = IntArray(width * height)
  bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

  var minX = width
  var minY = height
  var maxX = -1
  var maxY = -1
  for (y in 0 until height) {
    for (x in 0 until width) {
      if (Color.alpha(pixels[y * width + x]) > 8) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) throw IllegalStateException("empty subject")
  return Bitmap.createBitmap(bitmap, minX, minY, maxX - minX + 1, maxY - minY + 1)
}

/** Draws a white copy of the subject at points around a circle, then the subject on top. */
private fun addOutline(subject: Bitmap): Bitmap {
  val radius = max(subject.width, subject.height) * 0.025f
  val pad = Math.ceil((radius * 2).toDouble()).toInt()
  val output = Bitmap.createBitmap(subject.width + pad * 2, subject.height + pad * 2, Bitmap.Config.ARGB_8888)
  val canvas = Canvas(output)

  val white = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG).apply {
    colorFilter = PorterDuffColorFilter(Color.WHITE, PorterDuff.Mode.SRC_IN)
  }
  for (step in 0 until OUTLINE_STEPS) {
    val angle = 2.0 * PI * step / OUTLINE_STEPS
    canvas.drawBitmap(subject, pad + radius * cos(angle).toFloat(), pad + radius * sin(angle).toFloat(), white)
  }
  canvas.drawBitmap(subject, pad.toFloat(), pad.toFloat(), Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
  return output
}
