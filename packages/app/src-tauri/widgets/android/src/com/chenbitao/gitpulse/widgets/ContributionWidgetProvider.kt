package com.chenbitao.gitpulse.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.res.Configuration
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import com.chenbitao.gitpulse.R
import java.text.NumberFormat
import kotlin.math.roundToInt

open class ContributionWidgetProvider : AppWidgetProvider() {
    protected open val mode = "2d"
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { update(context, manager, it, mode) } }
    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) { update(context, manager, id, mode) }
    companion object {
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            listOf(ContributionWidget2D::class.java to "2d", ContributionWidget3D::class.java to "3d").forEach { (type,mode) ->
                manager.getAppWidgetIds(ComponentName(context,type)).forEach { update(context,manager,it,mode) }
            }
        }
        private fun update(context: Context, manager: AppWidgetManager, id: Int, mode: String) {
            val data = WidgetStorage.read(context)
            val options = manager.getAppWidgetOptions(id)
            val landscape = context.resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE
            val width = options.getInt(if(landscape) AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH else AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 280).coerceIn(110,600)
            val height = options.getInt(if(landscape) AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT else AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 160).coerceIn(110,500)
            val visibleWeeks = minOf(data.weeks, if(width < 220) 13 else if(height < 260) 26 else 54)
            val period = if(data.ready) data.text("近${visibleWeeks}周 · ", "近${visibleWeeks}週 · ", "${visibleWeeks}w · ", "${visibleWeeks}週 · ") else ""
            val density = context.resources.displayMetrics.density.coerceAtMost(2f)
            val dark = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES
            val foreground = if(dark) 0xffedf3ee.toInt() else 0xff172c21.toInt()
            val muted = if(dark) 0xff9cafa3.toInt() else 0xff61776a.toInt()
            val views = RemoteViews(context.packageName,R.layout.contribution_widget)
            views.setInt(R.id.widget_root,"setBackgroundResource",if(dark) R.drawable.widget_background_dark else R.drawable.widget_background)
            views.setTextViewText(R.id.widget_account, data.username?.let { "@$it" } ?: "GitPulse")
            views.setTextColor(R.id.widget_account,foreground)
            views.setImageViewResource(R.id.widget_mode,if(mode=="3d") R.drawable.widget_cube else R.drawable.widget_grid)
            views.setContentDescription(R.id.widget_mode,if(mode=="3d") "3D" else "2D")
            views.setTextViewText(R.id.widget_total,if(data.ready) NumberFormat.getIntegerInstance(data.locale).format(data.total) else "—")
            views.setTextColor(R.id.widget_total,foreground)
            views.setTextViewText(R.id.widget_caption,data.text("年度贡献", "年度貢獻", "contributions this year", "過去1年の貢献"))
            views.setTextColor(R.id.widget_caption,muted)
            views.setTextViewText(R.id.widget_footer,period + data.footer())
            views.setTextColor(R.id.widget_footer,muted)
            views.setTextViewText(R.id.widget_empty,data.emptyMessage())
            views.setTextColor(R.id.widget_empty,muted)
            views.setViewVisibility(R.id.widget_empty,if(data.ready) View.GONE else View.VISIBLE)
            views.setViewVisibility(R.id.widget_chart,if(data.ready) View.VISIBLE else View.GONE)
            // Always replace the entire RemoteViews: partial bitmap updates accumulate launcher memory.
            views.setImageViewBitmap(R.id.widget_chart,ContributionRenderer.bitmap(data,mode,((width-28)*density).roundToInt(),((height-90)*density).roundToInt(),dark,visibleWeeks))
            views.setContentDescription(R.id.widget_chart,"${if(mode=="3d") "3D" else "2D"} · ${data.total} " + data.text("次年度贡献，图表展示最近${visibleWeeks}周", "次年度貢獻，圖表展示最近${visibleWeeks}週", "contributions this year, chart shows the last ${visibleWeeks} weeks", "年間の貢献、直近${visibleWeeks}週間のグラフ"))
            context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { intent ->
                val open = PendingIntent.getActivity(context,id,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.widget_root,open)
            }
            manager.updateAppWidget(id,views)
        }
    }
}
class ContributionWidget2D : ContributionWidgetProvider()
class ContributionWidget3D : ContributionWidgetProvider() { override val mode = "3d" }
