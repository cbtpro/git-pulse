package com.chenbitao.gitpulse.widgets

import android.content.Context
import android.util.AtomicFile
import org.json.JSONObject
import java.io.File
import java.text.DateFormat
import java.util.Date
import java.util.Locale

data class ContributionDay(val date: String, val weekday: Int, val week: Int, val count: Int, val level: Int)
data class WidgetData(val accountId: String?, val username: String?, val language: String, val status: String,
    val updatedAt: Long?, val total: Int, val weeks: Int, val days: List<ContributionDay>) {
    val ready get() = status == "ready" && username != null && weeks > 0
    val locale: Locale get() = Locale.forLanguageTag(language)
    fun text(zh: String, tw: String, en: String, ja: String): String = when(language) {
        "zh-CN" -> zh; "zh-TW" -> tw; "ja" -> ja; else -> en
    }
    fun emptyMessage() = when(status) {
        "loading" -> text("正在同步贡献", "正在同步貢獻", "Syncing contributions", "貢献を同期中")
        "unavailable" -> text("打开应用重试", "開啟應用程式重試", "Open app to retry", "アプリで再試行")
        else -> text("打开 GitPulse 登录", "開啟 GitPulse 登入", "Open GitPulse to sign in", "GitPulse でログイン")
    }
    fun footer(): String {
        val at = updatedAt ?: return text("跟随当前账号", "跟隨目前帳號", "Follows active account", "現在のアカウントと同期")
        val stale = System.currentTimeMillis() - at > 24 * 60 * 60_000L
        return if (stale) text("打开应用更新", "開啟應用程式更新", "Open app to update", "アプリで更新")
        else text("更新 ", "更新 ", "Updated ", "更新 ") + DateFormat.getTimeInstance(DateFormat.SHORT, locale).format(Date(at))
    }
    companion object {
        fun empty() = WidgetData(null, null, Locale.getDefault().toLanguageTag(), "signedOut", null, 0, 0, emptyList())
        fun parse(payload: String): WidgetData {
            require(payload.length <= 80_000)
            val json = JSONObject(payload)
            val allowed = setOf("version", "accountId", "username", "language", "status", "updatedAt", "total", "weeks", "days")
            require(json.keys().asSequence().all { it in allowed })
            require(json.getInt("version") == 1)
            val weeks = json.getInt("weeks"); require(weeks in 0..54)
            val raw = json.getJSONArray("days"); require(raw.length() <= 378)
            val days = (0 until raw.length()).map { index ->
                val day = raw.getJSONObject(index)
                ContributionDay(day.getString("date"), day.getInt("weekday"), day.getInt("week"), day.getInt("count"), day.getInt("level")).also {
                    require(it.weekday in 0..6 && it.week in 0 until weeks && it.count >= 0 && it.level in 0..4)
                }
            }
            return WidgetData(if(json.isNull("accountId")) null else json.getString("accountId"),
                if(json.isNull("username")) null else json.getString("username"), json.getString("language"), json.getString("status"),
                if(json.isNull("updatedAt")) null else json.getLong("updatedAt"), json.getInt("total"), weeks, days)
        }
    }
}

object WidgetStorage {
    private fun file(context: Context) = AtomicFile(File(context.noBackupFilesDir, "contribution-widget.json"))
    @Synchronized fun read(context: Context): WidgetData = runCatching {
        val bytes = file(context).readFully()
        require(bytes.size <= 80_000)
        WidgetData.parse(bytes.toString(Charsets.UTF_8))
    }.getOrElse { WidgetData.empty() }
    @Synchronized fun write(context: Context, payload: String) {
        WidgetData.parse(payload)
        val file = file(context)
        val stream = file.startWrite()
        try { stream.write(payload.toByteArray(Charsets.UTF_8)); file.finishWrite(stream) }
        catch (error: Exception) { file.failWrite(stream); throw error }
    }
}
