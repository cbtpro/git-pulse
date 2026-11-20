package com.pe7er.gitpulse.widgets

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import app.tauri.plugin.JSObject
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import java.util.concurrent.Executors

@InvokeArg class WidgetUpdateArgs { lateinit var payload: String }
@InvokeArg class WidgetPinArgs { var mode: String = "2d" }

@TauriPlugin
class ContributionWidgetPlugin(private val activity: Activity) : Plugin(activity) {
    private val writes = Executors.newSingleThreadExecutor()
    @Command fun status(invoke: Invoke) {
        val result = JSObject()
        result.put("supported",true); result.put("available",true)
        result.put("canPin",Build.VERSION.SDK_INT >= 26 && AppWidgetManager.getInstance(activity).isRequestPinAppWidgetSupported)
        invoke.resolve(result)
    }
    @Command fun update(invoke: Invoke) {
        val args = invoke.parseArgs(WidgetUpdateArgs::class.java)
        writes.execute {
            try {
                WidgetStorage.write(activity.applicationContext,args.payload)
                ContributionWidgetProvider.updateAll(activity.applicationContext)
                invoke.resolve()
            } catch (_: Exception) { invoke.reject("Cannot update contribution widgets") }
        }
    }
    @Command fun pin(invoke: Invoke) {
        val mode = invoke.parseArgs(WidgetPinArgs::class.java).mode
        val manager = AppWidgetManager.getInstance(activity)
        val supported = Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported
        val result = if(supported) manager.requestPinAppWidget(ComponentName(activity,if(mode=="3d") ContributionWidget3D::class.java else ContributionWidget2D::class.java),null,null) else false
        // Tauri's Invoke resolves objects; wrap the result for a stable native contract.
        val response = JSObject(); response.put("accepted", result); invoke.resolve(response)
    }
}
