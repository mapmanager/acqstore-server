# Acceptance checks (after Phase B)

Use the grafted `.html` (extract from the Phase B `.zip` if you received a zip;
in Cursor, use the path the agent wrote). Then:

1. Graft opens via `file://`.  
2. Original Load Image / TIFF / demo still works.  
3. **AcqStore Server** → **Load File** works with the server at
   `http://127.0.0.1:8767`.  
4. **Successful Load File** means both:
   - **(i)** analysis image(s) populate in Image Display, and  
   - **(ii)** **ms per line** and **µm per pixel** are filled from the
     acquisition (Apply pixel dimensions if your UI still requires it).  
5. Status shows success; **Reference Images · …** disclosure updates.  
6. If reference data exists: Axes / Range… (Log, histogram, Min/Max/Auto) work.  

If Phase A failed and you still ran Phase B, breakage may match that disclaimer.
