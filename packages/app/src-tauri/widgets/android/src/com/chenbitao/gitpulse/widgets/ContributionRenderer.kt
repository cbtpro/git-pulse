package com.chenbitao.gitpulse.widgets

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import kotlin.math.*

object ContributionRenderer {
    data class Point(val x: Float, val y: Float)
    data class Face(val points: List<Point>, val depth: Float, val level: Int, val shade: Float)
    fun bitmap(data: WidgetData, mode: String, width: Int, height: Int, dark: Boolean, visibleWeeks: Int): Bitmap {
        // A single bounded bitmap keeps RemoteViews below the Binder/launcher memory budget.
        val result = Bitmap.createBitmap(width.coerceIn(80, 720), height.coerceIn(40, 440), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(result)
        val palette = if(dark) intArrayOf(0xff252b34.toInt(),0xff0e4429.toInt(),0xff006d32.toInt(),0xff26a641.toInt(),0xff39d353.toInt())
            else intArrayOf(0xffe6ece8.toInt(),0xff9be9a8.toInt(),0xff40c463.toInt(),0xff30a14e.toInt(),0xff216e39.toInt())
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        if (!data.ready) return result
        val start = data.weeks - visibleWeeks
        val days = data.days.filter { it.week >= start }.map { it.copy(week = it.week - start) }
        if(mode == "3d") {
            for(face in faces(days, visibleWeeks, result.width.toFloat(), result.height.toFloat())) {
                val color = palette[face.level]
                paint.color = Color.rgb((Color.red(color) * face.shade).roundToInt(),(Color.green(color) * face.shade).roundToInt(),(Color.blue(color) * face.shade).roundToInt())
                val path = Path(); face.points.forEachIndexed { i,p -> if(i==0) path.moveTo(p.x,p.y) else path.lineTo(p.x,p.y) }; path.close()
                canvas.drawPath(path,paint)
            }
        } else {
            val columns = if(visibleWeeks > 27) ceil(visibleWeeks / 2.0).toInt() else visibleWeeks
            val rows = if(columns < visibleWeeks) 16 else 7
            val step = min(result.width.toFloat() / columns, result.height.toFloat() / rows)
            val left = (result.width - step * columns) / 2
            val top = (result.height - step * rows) / 2
            for(day in days) {
                val x = left + (day.week % columns) * step
                val y = top + (day.weekday + day.week / columns * 9) * step
                paint.color = palette[day.level]
                val gap = max(1f,step * 0.18f)
                canvas.drawRoundRect(x,y,x+step-gap,y+step-gap,step*0.13f,step*0.13f,paint)
            }
        }
        return result
    }
    fun faces(days: List<ContributionDay>, weeks: Int, width: Float, height: Float): List<Face> {
        if(days.isEmpty()) return emptyList()
        val max = max(1,days.maxOf { it.count }).toFloat()
        val angle = 0.38f; val c = cos(angle); val s = sin(angle)
        fun point(x: Float,y: Float,z: Float): Point = Point((x-weeks/2f)*c-(y-3.5f)*s,((x-weeks/2f)*s+(y-3.5f)*c)*0.55f-z)
        val faces = days.flatMap { day ->
            val x = day.week.toFloat(); val y = day.weekday.toFloat()
            val z = if(day.count>0) 0.35f+5f*sqrt(day.count/max) else 0.12f
            val a=point(x,y,z);val b=point(x+0.78f,y,z);val c1=point(x+0.78f,y+0.78f,z);val d=point(x,y+0.78f,z)
            val depth=(x+0.39f-weeks/2f)*s+(y+0.39f-3.5f)*c
            listOf(Face(listOf(b,point(x+0.78f,y,0f),point(x+0.78f,y+0.78f,0f),c1),depth,day.level,0.75f),
                Face(listOf(d,c1,point(x+0.78f,y+0.78f,0f),point(x,y+0.78f,0f)),depth,day.level,0.88f),Face(listOf(a,b,c1,d),depth,day.level,1f))
        }.sortedBy { it.depth }
        val points=faces.flatMap { it.points };val minX=points.minOf { it.x };val maxX=points.maxOf { it.x };val minY=points.minOf { it.y };val maxY=points.maxOf { it.y }
        val scale=min((width-8)/(maxX-minX).coerceAtLeast(1f),(height-8)/(maxY-minY).coerceAtLeast(1f)).coerceAtLeast(0f)
        val left=(width-(maxX-minX)*scale)/2;val top=(height-(maxY-minY)*scale)/2
        return faces.map { face -> face.copy(points=face.points.map { Point(left+(it.x-minX)*scale,top+(it.y-minY)*scale) }) }
    }
}
