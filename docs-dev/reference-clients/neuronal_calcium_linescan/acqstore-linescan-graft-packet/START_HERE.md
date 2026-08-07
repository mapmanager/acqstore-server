# AcqStore linescan graft packet — start here

Zip **this folder** as `acqstore-linescan-graft-packet.zip` and send it with the
paste prompt below. You do not need to unzip the packet to use it.

## What you need

1. This packet zip  
2. Your analyzer `.html` file (keep your own copy; it is not modified)  
3. Anthropic Claude, ChatGPT, or Cursor (file upload / attach + result delivery)  
4. AcqStore Server at `http://127.0.0.1:8767` when you test the result  

## Steps

1. Attach the packet (zip **or** the `acqstore-linescan-graft-packet/` folder)
   and your analyzer HTML.  
2. Paste the prompt below.  
3. Review Phase A (PASS / WARNINGS / FAIL). Continue to Phase B when asked
   (allowed even after FAIL — read any disclaimer).  
4. Receive the graft:
   - **ChatGPT / Claude web:** download the Phase B **`.zip`**, then extract
     the `.html` (do not use a raw `.html` chat download).  
   - **Cursor:** use the new `.html` path the agent wrote on disk.  
5. Open that HTML as `file://…` and run the checks below.  

## Paste this into the LLM

```text
Attachments / context:
  1) acqstore-linescan-graft-packet (zip or folder)
  2) my linescan analyzer HTML (read-only)

Open the packet and follow WORKFLOW.md exactly.
```

## After you have the grafted HTML — acceptance checks

If you received a ZIP, extract the `.html` first, then:

1. Graft opens via `file://`.  
2. Original Load Image / TIFF / demo still works.  
3. **AcqStore Server** card shows **Load File** (server running).  
4. After **Load File** succeeds you should see:
   - **(i)** analysis image(s) populated in Image Display, and  
   - **(ii)** pixel scales filled: **ms per line** and **µm per pixel** (from the
     acquisition). Click **Apply pixel dimensions** if your analyzer still
     requires it before ROI/analysis.  
   Status should show a successful load; the **Reference Images · …** disclosure
   updates (expand if the file has reference image data).  
5. With a reference image: Axes / Range… (Log, histogram, Min/Max/Auto) work.  

## Packet layout (LLM uses these; you need not open them)

| Path | Role |
|------|------|
| `WORKFLOW.md` | Phase A → B instructions |
| `PROMPT.md` | Same short paste prompt |
| `docs/acqstore-server-additions.md` | Handoff contract |
| `graft-kit/` | Load card + reference disclosure UI + wiring |
| `ACCEPTANCE.md` | Same checks as above |
