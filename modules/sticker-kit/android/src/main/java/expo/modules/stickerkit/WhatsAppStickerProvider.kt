package expo.modules.stickerkit

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.content.UriMatcher
import android.content.res.AssetFileDescriptor
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.ParcelFileDescriptor
import org.json.JSONObject
import java.io.File

/**
 * Serves the pack written by [StickerKitModule] to WhatsApp. The contract (paths and column
 * names) is fixed by WhatsApp and must not be renamed.
 */
class WhatsAppStickerProvider : ContentProvider() {
  private lateinit var authority: String
  private val matcher = UriMatcher(UriMatcher.NO_MATCH)

  override fun onCreate(): Boolean {
    authority = "${context!!.packageName}.stickerkit"
    matcher.addURI(authority, "metadata", METADATA)
    matcher.addURI(authority, "metadata/*", METADATA_SINGLE)
    matcher.addURI(authority, "stickers/*", STICKERS)
    matcher.addURI(authority, "stickers_asset/*/*", ASSET)
    return true
  }

  override fun query(uri: Uri, projection: Array<String>?, selection: String?, selectionArgs: Array<String>?, sortOrder: String?): Cursor? {
    return when (matcher.match(uri)) {
      METADATA -> metadata(uri, readPacks())
      METADATA_SINGLE -> metadata(uri, readPacks().filter { it.identifier == uri.lastPathSegment })
      STICKERS -> stickers(uri)
      else -> throw IllegalArgumentException("Unknown URI: $uri")
    }
  }

  override fun openAssetFile(uri: Uri, mode: String): AssetFileDescriptor? {
    if (matcher.match(uri) != ASSET) return null
    val segments = uri.pathSegments
    val identifier = segments[segments.size - 2]
    val name = segments.last()
    // Names come from a URI WhatsApp (or anyone with the permission) supplies; keep them inside the pack dir.
    if (identifier.contains('/') || name.contains('/') || name.contains("..")) return null
    val file = File(File(packsDir(context!!), identifier), name)
    if (!file.exists()) return null
    val descriptor = ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY)
    return AssetFileDescriptor(descriptor, 0, AssetFileDescriptor.UNKNOWN_LENGTH)
  }

  override fun getType(uri: Uri): String = when (matcher.match(uri)) {
    METADATA -> "vnd.android.cursor.dir/vnd.$authority.metadata"
    METADATA_SINGLE -> "vnd.android.cursor.item/vnd.$authority.metadata"
    STICKERS -> "vnd.android.cursor.dir/vnd.$authority.stickers"
    ASSET -> if (uri.lastPathSegment == TRAY_FILE) "image/png" else "image/webp"
    else -> throw IllegalArgumentException("Unknown URI: $uri")
  }

  private fun metadata(uri: Uri, packs: List<PackManifest>): Cursor {
    val cursor = MatrixCursor(
      arrayOf(
        "sticker_pack_identifier", "sticker_pack_name", "sticker_pack_publisher", "sticker_pack_icon",
        "android_play_store_link", "ios_app_download_link", "sticker_pack_publisher_email",
        "sticker_pack_publisher_website", "sticker_pack_privacy_policy_website",
        "sticker_pack_license_agreement_website", "image_data_version",
        "whatsapp_will_not_cache_stickers", "animated_sticker_pack",
      )
    )
    for (pack in packs) {
      cursor.addRow(arrayOf(pack.identifier, pack.name, pack.publisher, TRAY_FILE, "", "", "", "", "", "", pack.version, 0, 0))
    }
    cursor.setNotificationUri(context!!.contentResolver, uri)
    return cursor
  }

  private fun stickers(uri: Uri): Cursor {
    val cursor = MatrixCursor(arrayOf("sticker_file_name", "sticker_emoji", "sticker_accessibility_text"))
    readPacks().filter { it.identifier == uri.lastPathSegment }.forEach { pack ->
      pack.stickers.forEach { cursor.addRow(arrayOf(it.first, it.second.joinToString(","), "")) }
    }
    cursor.setNotificationUri(context!!.contentResolver, uri)
    return cursor
  }

  private class PackManifest(
    val identifier: String,
    val name: String,
    val publisher: String,
    val version: String,
    val stickers: List<Pair<String, List<String>>>,
  )

  private fun readPacks(): List<PackManifest> {
    val root = packsDir(context!!)
    return root.listFiles { file -> file.isDirectory }.orEmpty().mapNotNull { dir ->
      val manifest = File(dir, MANIFEST_FILE)
      if (!manifest.exists()) return@mapNotNull null
      val json = JSONObject(manifest.readText())
      val stickers = json.getJSONArray("stickers")
      PackManifest(
        identifier = json.getString("identifier"),
        name = json.getString("name"),
        publisher = json.getString("publisher"),
        version = json.getString("version"),
        stickers = (0 until stickers.length()).map { index ->
          val item = stickers.getJSONObject(index)
          val emojis = item.getJSONArray("emojis")
          item.getString("file") to (0 until emojis.length()).map { emojis.getString(it) }
        },
      )
    }
  }

  override fun insert(uri: Uri, values: ContentValues?): Uri? = throw UnsupportedOperationException("Not supported")
  override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<String>?): Int =
    throw UnsupportedOperationException("Not supported")
  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<String>?): Int =
    throw UnsupportedOperationException("Not supported")

  companion object {
    private const val METADATA = 1
    private const val METADATA_SINGLE = 2
    private const val STICKERS = 3
    private const val ASSET = 4

    const val TRAY_FILE = "tray.png"
    const val MANIFEST_FILE = "pack.json"

    fun packsDir(context: Context): File = File(context.filesDir, "stickerkit/whatsapp").also { it.mkdirs() }
  }
}
