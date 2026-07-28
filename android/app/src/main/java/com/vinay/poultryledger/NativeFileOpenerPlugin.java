package com.vinay.poultryledger;

import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "NativeFileOpener")
public class NativeFileOpenerPlugin extends Plugin {

    @PluginMethod
    public void openFile(PluginCall call) {
        String filePath = call.getString("filePath");
        String mimeType = call.getString("mimeType", "application/pdf");

        if (filePath == null || filePath.isEmpty()) {
            call.reject("File path is required");
            return;
        }

        try {
            File file = null;

            if (filePath.startsWith("file://")) {
                file = new File(Uri.parse(filePath).getPath());
            } else if (filePath.startsWith("/storage/") || filePath.startsWith("/sdcard/") || filePath.startsWith("content://")) {
                file = new File(filePath);
            } else {
                File docsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);
                file = new File(docsDir, filePath);
            }

            if (file == null || !file.exists()) {
                String cleanPath = filePath.replace("file://", "");
                file = new File(cleanPath);
            }

            if (file == null || !file.exists()) {
                call.reject("File does not exist on disk: " + filePath);
                return;
            }

            if (mimeType == null || mimeType.isEmpty() || mimeType.equals("*/*")) {
                String lowerName = file.getName().toLowerCase();
                if (lowerName.endsWith(".pdf")) {
                    mimeType = "application/pdf";
                } else if (lowerName.endsWith(".json")) {
                    mimeType = "application/json";
                } else {
                    mimeType = "application/octet-stream";
                }
            }

            // Generate content:// URI using FileProvider
            String authority = getContext().getPackageName() + ".fileprovider";
            Uri contentUri = FileProvider.getUriForFile(getContext(), authority, file);

            // Build ACTION_VIEW intent with temporary read permission
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, mimeType);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            Intent chooser = Intent.createChooser(intent, "Open file with");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            if (intent.resolveActivity(getContext().getPackageManager()) != null) {
                getContext().startActivity(chooser);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } else {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("noAppFound", true);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Failed to launch file viewer: " + e.getMessage(), e);
        }
    }
}
