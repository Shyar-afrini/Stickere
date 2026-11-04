package expo.modules.stickerkit

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.FileProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class StickerRecord : Record {
  @Field var uri: String = ""
  @Field var emojis: List<String> = emptyList()
}

class WhatsAppPackRecord : Record {
  @Field var identifier: String = ""
  @Field var name: String = ""
  @Field var publisher: String = ""
  @Field var trayUri: String = ""
  @Field var stickers: List<StickerRecord> = emptyList()
}

class MakeStickerOptions : Record {
  @Field var outline: Boolean = true
}

class TelegramPackRecord : Record {
  @Field var stickers: List<StickerRecord> = emptyList()
}

class AppNotInstalledException(app: String) :
  CodedException("ERR_APP_NOT_INSTALLED", "$app is not installed on this device.", null)

private val WHATSAPP_PACKAGES = listOf("com.whatsapp", "com.whatsapp.w4b")
private val TELEGRAM_PACKAGES = listOf("org.telegram.messenger", "org.telegram.messenger.web")

class StickerKitModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("StickerKit")

    AsyncFunction("isInstalled") { app: String ->
      installedPackage(if (app == "whatsapp") WHATSAPP_PACKAGES else TELEGRAM_PACKAGES) != null
    }

    AsyncFunction("makeSticker") { uri: String, options: MakeStickerOptions, promise: Promise ->
      cutOutSubject(context, uriToPath(uri), options.outline, promise)
    }

    AsyncFunction("shareToWhatsApp") { pack: WhatsAppPackRecord ->
      val target = installedPackage(WHATSAPP_PACKAGES) ?: throw AppNotInstalledException("WhatsApp")

      val dir = File(WhatsAppStickerProvider.packsDir(context), pack.identifier)
      dir.deleteRecursively()
      dir.mkdirs()

      writePng(renderSquare(uriToPath(pack.trayUri), TRAY_SIDE), File(dir, WhatsAppStickerProvider.TRAY_FILE))

      val manifestStickers = JSONArray()
      pack.stickers.forEachIndexed { index, sticker ->
        val fileName = "sticker_$index.webp"
        writeWebp(renderSquare(uriToPath(sticker.uri), STICKER_SIDE), File(dir, fileName), MAX_STICKER_BYTES)
        manifestStickers.put(JSONObject().put("file", fileName).put("emojis", JSONArray(sticker.emojis)))
      }

      // WhatsApp caches by version; bump it so a changed pack with the same id is re-read.
      val manifest = JSONObject()
        .put("identifier", pack.identifier)
        .put("name", pack.name)
        .put("publisher", pack.publisher)
        .put("version", System.currentTimeMillis().toString())
        .put("stickers", manifestStickers)
      File(dir, WhatsAppStickerProvider.MANIFEST_FILE).writeText(manifest.toString())

      val intent = Intent("com.whatsapp.intent.action.ENABLE_STICKER_PACK")
        .setPackage(target)
        .putExtra("sticker_pack_id", pack.identifier)
        .putExtra("sticker_pack_authority", "${context.packageName}.stickerkit")
        .putExtra("sticker_pack_name", pack.name)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      try {
        context.startActivity(intent)
      } catch (_: ActivityNotFoundException) {
        throw AppNotInstalledException("WhatsApp")
      }
    }

    AsyncFunction("shareToTelegram") { pack: TelegramPackRecord ->
      val target = installedPackage(TELEGRAM_PACKAGES) ?: throw AppNotInstalledException("Telegram")

      val dir = File(context.filesDir, "stickerkit/telegram")
      dir.deleteRecursively()
      dir.mkdirs()

      val authority = "${context.packageName}.stickerkit.files"
      val uris = ArrayList<android.net.Uri>()
      pack.stickers.forEachIndexed { index, sticker ->
        val file = File(dir, "sticker_$index.png")
        writePng(renderSquare(uriToPath(sticker.uri), STICKER_SIDE), file)
        val uri = FileProvider.getUriForFile(context, authority, file)
        context.grantUriPermission(target, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
        uris.add(uri)
      }

      val emojis = ArrayList(pack.stickers.map { it.emojis.joinToString("") })
      val intent = Intent("org.telegram.messenger.CREATE_STICKER_PACK")
        .setPackage(target)
        .putExtra(Intent.EXTRA_STREAM, uris)
        .putExtra("IMPORTER", context.packageName)
        .putStringArrayListExtra("STICKER_EMOJIS", emojis)
        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
      intent.type = "image/*"
      try {
        context.startActivity(intent)
      } catch (_: ActivityNotFoundException) {
        throw AppNotInstalledException("Telegram")
      }
    }
  }

  private fun installedPackage(candidates: List<String>): String? =
    candidates.firstOrNull { name ->
      try {
        context.packageManager.getPackageInfo(name, 0)
        true
      } catch (_: PackageManager.NameNotFoundException) {
        false
      }
    }
}
