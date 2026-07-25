# Get the desktop app

Please [fill out this form](request-desktop-app.md) to request AcqStore Server for macOS or Windows. You will get an email with a download link.

After you receive the ZIP, install and run it with the steps below.

Contact Robert Cudmore ([robert.cudmore@gmail.com](mailto:robert.cudmore@gmail.com)) with any questions.

## Running the app

=== "macOS"

    1. Unzip the download.
    2. Move **AcqStore Server.app** somewhere convenient (for example Applications).
    3. Open the app.

    If macOS blocks the app the first time, open **System Settings → Privacy & Security** and allow it, or right-click the app and choose **Open**.

=== "Windows"

    ### Unblock the ZIP

    !!! warning "Unblock before extracting"
        Windows may mark downloaded ZIPs. Unblock before extract if you see a security warning or the app fails to start.

        1. Right-click the ZIP → **Properties**.
        2. If **Unblock** is shown, enable it → **Apply** → **OK**.

    ### Extract and run

    1. Extract the ZIP (do not run from inside the archive).
    2. Run the AcqStore Server executable from the extracted folder.

## After it starts

The status window appears and the local API listens on:

```text
http://127.0.0.1:8767
```

Next: [Status window](gui.md) and [Built-in demo](demo.md).
