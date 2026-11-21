package com.chenbitao.gitpulse

import android.os.Bundle
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  // Called on the UI thread by the native download command, only for completed files.
  @androidx.annotation.Keep
  fun shareDownloadedFile(path: String) {
    val file = java.io.File(path).canonicalFile
    val root = java.io.File(cacheDir, "downloads").canonicalFile
    require(file.path.startsWith(root.path + java.io.File.separator) && file.isFile)
    val uri = androidx.core.content.FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
      type = "application/octet-stream"
      putExtra(android.content.Intent.EXTRA_STREAM, uri)
      clipData = android.content.ClipData.newRawUri("download", uri)
      addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    startActivity(android.content.Intent.createChooser(intent, file.name))
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }
}
