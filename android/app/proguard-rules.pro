# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep Capacitor Core classes and native plugin interfaces
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    public <init>(...);
    @com.getcapacitor.PluginMethod public *;
}
-keepattributes *Annotation*,Signature,SourceFile,LineNumberTable

# Capacitor SQLite plugin
-keep class com.getcapacitor.community.database.sqlite.** { *; }
-keep class io.sqlc.** { *; }
-keep class org.sqlite.** { *; }

# Capacitor Preferences plugin
-keep class com.capacitorjs.plugins.preferences.** { *; }

# Capacitor Filesystem plugin
-keep class com.capacitorjs.plugins.filesystem.** { *; }

# Capacitor Share & FilePicker plugins
-keep class com.capacitorjs.plugins.share.** { *; }
-keep class io.capawesome.capacitor.filepicker.** { *; }

