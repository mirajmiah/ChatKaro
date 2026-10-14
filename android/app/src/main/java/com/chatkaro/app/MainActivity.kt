package com.chatkaro.app

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import java.net.CookieManager
import java.net.CookiePolicy
import java.net.HttpURLConnection
import java.net.URL
import java.io.OutputStreamWriter
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val apiBase = "https://chatkaro-7cv0.onrender.com/api"
    private val executor = Executors.newSingleThreadExecutor()
    private val cookies = CookieManager(null, CookiePolicy.ACCEPT_ALL)
    private lateinit var root: LinearLayout
    private var currentUserId: String? = null
    private var currentUserName: String = "ChatKaro"
    private var messagesBox: LinearLayout? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        java.net.CookieHandler.setDefault(cookies)
        showLogin()
        executor.execute {
            try {
                val user = request("GET", "/auth/check", null)
                runOnUiThread { showContacts(user.optString("fullName", "ChatKaro")) }
            } catch (_: Exception) { }
        }
    }

    private fun baseLayout(title: String) {
        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(22, 26, 22, 18)
            setBackgroundColor(Color.rgb(248, 247, 252))
        }
        root.addView(TextView(this).apply {
            text = title
            textSize = 27f
            setTextColor(Color.rgb(75, 48, 125))
            setPadding(0, 0, 0, 22)
        })
        setContentView(root)
    }

    private fun field(hint: String, password: Boolean = false) = EditText(this).apply {
        this.hint = hint
        textSize = 16f
        setSingleLine(true)
        if (password) inputType = 129
        root.addView(this, ViewGroup.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT))
    }

    private fun action(label: String, onClick: () -> Unit) {
        root.addView(Button(this).apply {
            text = label
            setOnClickListener { onClick() }
        }, ViewGroup.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT))
    }

    private fun status(message: String) {
        root.addView(TextView(this).apply {
            text = message
            textSize = 14f
            setTextColor(Color.DKGRAY)
            setPadding(0, 12, 0, 8)
        })
    }

    private fun showLogin(error: String? = null) {
        runOnUiThread {
            baseLayout("ChatKaro")
            status("Sign in to continue chatting.")
            val email = field("Email address")
            val password = field("Password", true)
            if (error != null) status(error)
            action("Sign in") {
                val emailText = email.text.toString().trim()
                val passwordText = password.text.toString()
                if (emailText.isBlank() || passwordText.isBlank()) {
                    status("Enter your email and password.")
                    return@action
                }
                status("Signing in…")
                executor.execute {
                    try {
                        request("POST", "/auth/login", JSONObject()
                            .put("email", emailText).put("password", passwordText))
                        val user = request("GET", "/auth/check", null)
                        runOnUiThread { showContacts(user.optString("fullName", "ChatKaro")) }
                    } catch (e: Exception) {
                        runOnUiThread { showLogin(e.message ?: "Login failed. Please try again.") }
                    }
                }
            }
        }
    }

    private fun showContacts(name: String) {
        currentUserName = name
        runOnUiThread {
            baseLayout("Hi, $name")
            status("Your ChatKaro contacts")
            val scroll = ScrollView(this)
            val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            scroll.addView(list)
            root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
            status("Only accepted contacts appear here.")
            executor.execute {
                try {
                    val users = requestArray("GET", "/messages/users", null)
                    runOnUiThread {
                        list.removeAllViews()
                        if (users.length() == 0) {
                            list.addView(TextView(this).apply {
                                text = "No contacts yet. Add contacts from the ChatKaro website for now."
                                textSize = 16f
                                setPadding(8, 18, 8, 18)
                            })
                        }
                        for (i in 0 until users.length()) {
                            val user = users.getJSONObject(i)
                            val id = user.optString("_id")
                            val displayName = user.optString("fullName", user.optString("email", "Contact"))
                            list.addView(Button(this).apply {
                                text = displayName
                                gravity = Gravity.START or Gravity.CENTER_VERTICAL
                                setOnClickListener { openConversation(id, displayName) }
                            }, ViewGroup.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT))
                        }
                    }
                } catch (e: Exception) {
                    runOnUiThread { status("Could not load contacts: ${e.message ?: "network error"}") }
                }
            }
            action("Refresh contacts") { showContacts(currentUserName) }
            action("Log out") {
                executor.execute {
                    try { request("POST", "/auth/logout", JSONObject()) } catch (_: Exception) { }
                    cookies.cookieStore.removeAll()
                    showLogin()
                }
            }
        }
    }

    private fun openConversation(userId: String, name: String) {
        currentUserId = userId
        runOnUiThread {
            baseLayout(name)
            val scroll = ScrollView(this)
            val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            scroll.addView(box)
            root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f))
            messagesBox = box
            val composer = EditText(this).apply { hint = "Write a message"; minLines = 1; maxLines = 4 }
            root.addView(composer, ViewGroup.LayoutParams(-1, ViewGroup.LayoutParams.WRAP_CONTENT))
            action("Send message") {
                val text = composer.text.toString().trim()
                if (text.isNotEmpty()) {
                    executor.execute {
                        try {
                            request("POST", "/messages/send/$userId", JSONObject().put("text", text))
                            runOnUiThread { composer.setText("") }
                            loadMessages(userId)
                        } catch (e: Exception) {
                            runOnUiThread { status("Could not send: ${e.message ?: "network error"}") }
                        }
                    }
                }
            }
            action("Back to contacts") { showContacts(currentUserName) }
            loadMessages(userId)
        }
    }

    private fun loadMessages(userId: String) {
        executor.execute {
            try {
                val data = requestArray("GET", "/messages/$userId", null)
                runOnUiThread {
                    val box = messagesBox ?: return@runOnUiThread
                    box.removeAllViews()
                    for (i in 0 until data.length()) {
                        val item = data.getJSONObject(i)
                        val text = if (item.has("deletedAt")) "This message was deleted" else item.optString("text", "[Attachment]")
                        box.addView(TextView(this).apply {
                            this.text = text
                            textSize = 16f
                            setTextColor(Color.DKGRAY)
                            setPadding(10, 10, 10, 10)
                        })
                    }
                }
            } catch (e: Exception) {
                runOnUiThread { status("Could not load messages: ${e.message ?: "network error"}") }
            }
        }
    }

    private fun request(method: String, path: String, body: JSONObject?): JSONObject {
        val connection = URL(apiBase + path).openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 15000
        connection.readTimeout = 15000
        connection.setRequestProperty("Accept", "application/json")
        if (body != null) {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }
        }
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val response = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        connection.disconnect()
        if (code !in 200..299) {
            val message = try { JSONObject(response).optString("message", "Request failed ($code)") } catch (_: Exception) { "Request failed ($code)" }
            throw IllegalStateException(message)
        }
        return if (response.isBlank()) JSONObject() else JSONObject(response)
    }

    private fun requestArray(method: String, path: String, body: JSONObject?): JSONArray {
        val connection = URL(apiBase + path).openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 15000
        connection.readTimeout = 15000
        connection.setRequestProperty("Accept", "application/json")
        if (body != null) {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { it.write(body.toString()) }
        }
        val code = connection.responseCode
        val stream = if (code in 200..299) connection.inputStream else connection.errorStream
        val response = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        connection.disconnect()
        if (code !in 200..299) throw IllegalStateException("Request failed ($code)")
        return JSONArray(response)
    }
}
