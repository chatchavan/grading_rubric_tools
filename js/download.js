// ── §7  Download / export: CSV, JSON, Markdown ZIP, PDF ZIP ──────────────────

function downloadCSV() {
    let csv = 'Student Name';
    rubricData.forEach(criterion => {
        csv += ',' + '"' + criterion.name + '"';
    });
    csv += ',Total Score,Notes\n';

    students.forEach(student => {
        if (student.name || Object.keys(student.scores).length > 0) {
            csv += '"' + (student.name || 'Unnamed Student') + '"';
            let totalScore = 0;

            rubricData.forEach((criterion, criterionIndex) => {
                const score = student.scores[criterionIndex];
                if (score) {
                    csv += ',' + score.score;
                    totalScore += score.score;
                } else {
                    csv += ',';
                }
            });

            const notesValue = (student.notes || '').replace(/"/g, '""');
            csv += ',' + totalScore + ',"' + notesValue + '"\n';
        }
    });

    downloadFile(csv, `grading_results_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

function downloadJSON() {
    const allData = {};
    Object.values(STORAGE_KEYS).forEach(key => {
        allData[key] = loadFromLocalStorage(key);
    });

    downloadFile(JSON.stringify(allData, null, 2), `rubric_editor_data_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

function downloadMarkdownZip() {
    const zip = new JSZip();
    let hasValidStudents = false;

    students.forEach((student, studentIndex) => {
        if (student.name || Object.keys(student.scores).length > 0) {
            hasValidStudents = true;
            const studentName = student.name || `Author${String(studentIndex + 1).padStart(2, '0')}`;
            let markdown = `# Grading Results - ${studentName}\n\n`;

            let totalScore = 0;
            let rubricMarkdown = "";
            rubricData.forEach((criterion, criterionIndex) => {
                const score = student.scores[criterionIndex];
                rubricMarkdown += `\n\n- ${criterion.name}:${score ? '' : '  (not graded)'}\n`;
                criterion.options.forEach(option => {
                    const isSelected = score && score.score === option.score;
                    const pointer = isSelected ? '👉 ' : '';
                    rubricMarkdown += `\t- ${pointer}(${option.score}) ${option.text}\n`;
                });
                if (score) {
                    totalScore += score.score;
                }
            });

            markdown += `\n**Total Score: ${totalScore} / ${getMaxScore()}**\n ${rubricMarkdown}\n`;

            if (student.notes && student.notes.trim()) {
                markdown += `\n---\n\n**Notes:**\n\n${student.notes.trim()}\n`;
            }
            // markdown += `*Generated on ${new Date().toLocaleString()}*\n`;

            // Clean filename by removing invalid characters
            const cleanFileName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
            zip.file(`${cleanFileName}.md`, markdown);
        }
    });

    if (!hasValidStudents) {
        alert('No student data found to export.');
        return;
    }

    zip.generateAsync({ type: "blob" }).then(function(content) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grading_results_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function downloadPDFZip() {
    if (typeof window.jspdf === 'undefined') {
        alert('PDF library is still loading. Please try again in a moment.');
        return;
    }

    const validStudents = students.filter(s => s.name || Object.keys(s.scores).length > 0);
    if (validStudents.length === 0) {
        alert('No student data found to export.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const zip = new JSZip();

    // Read PDF header fields once (same for every student)
    const courseName     = document.getElementById('courseName').value.trim();
    const assignmentName = document.getElementById('assignmentName').value.trim();

    // Convert hex colour to [r,g,b]
    function rgb(hex) {
        return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    }

    validStudents.forEach(student => {
        const studentName = student.name || 'Unnamed Student';
        const doc  = new jsPDF({ unit: 'mm', format: 'a4' });

        const PH = 297, ML = 15, MT = 18, MB = 15, CW = 180;
        let y = MT;

        // Start a new page if the next block won't fit
        function guard(need) {
            if (y + need > PH - MB) { doc.addPage(); y = MT; }
        }

        // ── Course / Assignment header bar ────────────────────────
        if (courseName || assignmentName) {
            doc.setFillColor(241, 243, 245);          // #f1f3f5 light gray
            doc.roundedRect(ML, y, CW, 9, 1.5, 1.5, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(108, 117, 125);           // #6c757d muted
            if (courseName)     doc.text(courseName,     ML + 4,        y + 6);
            if (assignmentName) doc.text(assignmentName, ML + CW - 4,   y + 6, { align: 'right' });
            y += 20;
        }

        // ── Student name ──────────────────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...rgb('#2c3e50'));
        doc.text(studentName, ML, y);
        y += 5;

        // ── Score bar ─────────────────────────────────────────────
        const totalScore  = Object.values(student.scores).reduce((s, v) => s + v.score, 0);
        const maxScore    = getMaxScore();
        const selCount    = Object.keys(student.scores).length;
        const allDone     = selCount === rubricData.length;

        doc.setFillColor(...(allDone ? rgb('#28a745') : rgb('#ffc107')));
        doc.roundedRect(ML, y, CW, 10, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...(allDone ? [255,255,255] : rgb('#212529')));
        const scoreLabel = `Total Score: ${totalScore} / ${maxScore}` +
            (allDone ? '' : `   (${selCount} of ${rubricData.length} criteria scored)`);
        doc.text(scoreLabel, ML + CW / 2, y + 6.5, { align: 'center' });
        y += 17;

        // ── Rubric criteria ───────────────────────────────────────
        rubricData.forEach((criterion, ci) => {
            const savedScore = student.scores[ci];

            // Measure header
            doc.setFontSize(10);
            const hLines = doc.splitTextToSize(criterion.name, CW - 8);
            const hH     = hLines.length * 5 + 5;      // ~10 mm for one line

            if (isColumnLayout) {
                // ── Column mode: all options side-by-side ──────────────
                const N    = criterion.options.length;
                const gap  = 2;
                const colW = (CW - gap * (N - 1)) / N;

                // Measure tallest option text so all columns share one height
                doc.setFontSize(8);
                let maxLines = 1;
                criterion.options.forEach(opt => {
                    const ls = doc.splitTextToSize(opt.text, colW - 6);
                    if (ls.length > maxLines) maxLines = ls.length;
                });

                const lineH8   = 8 * 0.3528 * 1.15;   // ≈ 3.25 mm/line at 8 pt
                const badgeH   = 7;
                const innerGap = 3;
                const colH     = 4 + badgeH + innerGap + maxLines * lineH8 + 4;

                // Guard once for header + columns together
                guard(hH + 1 + colH + 2);

                // Draw header
                doc.setFontSize(10);
                doc.setFillColor(...rgb('#495057'));
                doc.roundedRect(ML, y, CW, hH, 2, 2, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                hLines.forEach((line, li) => doc.text(line, ML + 4, y + 6.5 + li * 4.5));
                y += hH + 1;

                // Draw columns
                criterion.options.forEach((option, oi) => {
                    const isSelected = savedScore && savedScore.score === option.score;
                    const colX = ML + oi * (colW + gap);

                    doc.setFillColor(...(isSelected ? rgb('#007bff') : [255, 255, 255]));
                    doc.roundedRect(colX, y, colW, colH, 1.5, 1.5, 'F');
                    if (!isSelected) {
                        doc.setDrawColor(220, 224, 230);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(colX, y, colW, colH, 1.5, 1.5, 'S');
                    }

                    const bW = Math.min(colW * 0.55, 22);
                    const bX = colX + colW / 2 - bW / 2;
                    doc.setFillColor(...(isSelected ? [255, 255, 255] : rgb('#28a745')));
                    doc.roundedRect(bX, y + 4, bW, badgeH, 1.5, 1.5, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(...(isSelected ? rgb('#007bff') : [255, 255, 255]));
                    doc.text(String(option.score), colX + colW / 2, y + 4 + badgeH - 2.2, { align: 'center' });

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(...(isSelected ? [255, 255, 255] : [50, 50, 50]));
                    const oLines = doc.splitTextToSize(option.text, colW - 6);
                    const textY  = y + 4 + badgeH + innerGap + 3;
                    doc.text(oLines, colX + colW / 2, textY, { align: 'center' });
                });

                y += colH + 4;

            } else {
                // ── Row mode: one option per row ──────────────────────
                // Pre-measure every option so we can guard once for the whole criterion
                doc.setFontSize(9);
                const optSizes = criterion.options.map(opt => {
                    const oLines = doc.splitTextToSize(opt.text, CW - 22);
                    return { oLines, oH: Math.max(10, oLines.length * 4 + 6) };
                });
                const totalOptH = optSizes.reduce((sum, { oH }) => sum + oH + 2, 0);

                // Guard once for header + all option rows together
                guard(hH + 1 + totalOptH);

                // Draw header
                doc.setFontSize(10);
                doc.setFillColor(...rgb('#495057'));
                doc.roundedRect(ML, y, CW, hH, 2, 2, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                hLines.forEach((line, li) => doc.text(line, ML + 4, y + 6.5 + li * 4.5));
                y += hH + 1;

                // Draw option rows
                optSizes.forEach(({ oLines, oH }, oi) => {
                    const option     = criterion.options[oi];
                    const isSelected = savedScore && savedScore.score === option.score;

                    doc.setFillColor(...(isSelected ? rgb('#007bff') : [255, 255, 255]));
                    doc.roundedRect(ML, y, CW, oH, 1.5, 1.5, 'F');
                    if (!isSelected) {
                        doc.setDrawColor(220, 224, 230);
                        doc.setLineWidth(0.2);
                        doc.roundedRect(ML, y, CW, oH, 1.5, 1.5, 'S');
                    }

                    doc.setFillColor(...(isSelected ? [255, 255, 255] : rgb('#28a745')));
                    doc.roundedRect(ML + 2, y + oH/2 - 3.5, 10, 7, 1.5, 1.5, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(8);
                    doc.setTextColor(...(isSelected ? rgb('#007bff') : [255, 255, 255]));
                    doc.text(String(option.score), ML + 7, y + oH/2 + 1.2, { align: 'center' });

                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(9);
                    doc.setTextColor(...(isSelected ? [255, 255, 255] : [50, 50, 50]));
                    const tY = y + (oH - oLines.length * 4) / 2 + 3.5;
                    doc.text(oLines, ML + 15, tY);

                    y += oH + 2;
                });
            }

            y += 4; // gap between criteria
        });

        // ── Notes section ─────────────────────────────────────────
        const studentNotes = (student.notes || '').trim();
        if (studentNotes) {
            doc.setFontSize(9);
            const noteLines = doc.splitTextToSize(studentNotes, CW - 8);
            const noteLabelH = 7;
            const noteBodyH  = noteLines.length * 4 + 6;
            const noteTotalH = noteLabelH + noteBodyH + 4;

            guard(noteTotalH);

            // Label bar
            doc.setFillColor(241, 243, 245);
            doc.roundedRect(ML, y, CW, noteLabelH, 1.5, 1.5, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(108, 117, 125);
            doc.text('Notes', ML + 4, y + 5);
            y += noteLabelH + 1;

            // Body box
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(220, 224, 230);
            doc.setLineWidth(0.2);
            doc.roundedRect(ML, y, CW, noteBodyH, 1.5, 1.5, 'FD');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(50, 50, 50);
            doc.text(noteLines, ML + 4, y + 5);
            y += noteBodyH + 4;
        }

        // Add "page X of Y" to the bottom-right of every page
        const totalPages = doc.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`page ${p} of ${totalPages}`, ML + CW, PH - 6, { align: 'right' });
        }

        const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
        zip.file(`${cleanName}.pdf`, doc.output('blob'));
    });

    zip.generateAsync({ type: 'blob' }).then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grading_pdf_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    /* text area JSON export (for using on iPad) — currently unused
    let exportTextarea = document.querySelector("#export");

    if(!exportTextarea) {
        exportTextarea = document.createElement("textarea");
        exportTextarea.setAttribute('id', 'export');
        document.body.appendChild(exportTextarea);

        const copyBtn = document.createElement("button");
        copyBtn.innerHTML = "Copy";
        copyBtn.setAttribute('type', 'button');
        copyBtn.setAttribute('class', 'download-button');

        copyBtn.addEventListener("click", function() {
          var copyText = document.querySelector("#export");
          copyText.select();
          document.execCommand("copy");
        });
        document.body.appendChild(copyBtn);
    }

    exportTextarea.value = content;
    */
}
