"""PDF generation service using ReportLab."""
import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT


# Brand colors
PRIMARY_COLOR = HexColor("#6366f1")  # Indigo
SECONDARY_COLOR = HexColor("#8b5cf6")  # Purple
DARK_COLOR = HexColor("#1e1b4b")
LIGHT_GRAY = HexColor("#f1f5f9")
BORDER_COLOR = HexColor("#e2e8f0")
JEE_COLOR = HexColor("#f59e0b")   # Amber for JEE
NEET_COLOR = HexColor("#ec4899")  # Pink for NEET


def create_exam_pdf(
    title: str,
    student_class: str,
    subject: str,
    questions: list,
    duration_minutes: int = 60,
    total_marks: int = 100,
    test_type: str = "Chapter Test",
) -> bytes:
    """Generate a formatted exam paper PDF and return as bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        leftMargin=2 * cm, rightMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    # Pick accent color based on test type
    if test_type == "JEE":
        accent = JEE_COLOR
        exam_label = "JEE Pattern"
    elif test_type == "NEET":
        accent = NEET_COLOR
        exam_label = "NEET Pattern"
    else:
        accent = PRIMARY_COLOR
        exam_label = "CBSE Pattern"

    # Custom styles
    title_style = ParagraphStyle("ExamTitle", parent=styles["Title"], fontSize=20, textColor=DARK_COLOR, alignment=TA_CENTER, spaceAfter=4)
    subtitle_style = ParagraphStyle("ExamSubtitle", parent=styles["Normal"], fontSize=12, textColor=accent, alignment=TA_CENTER, spaceAfter=6)
    section_style = ParagraphStyle("SectionHeader", parent=styles["Heading2"], fontSize=14, textColor=accent, spaceBefore=12, spaceAfter=6)
    question_style = ParagraphStyle("Question", parent=styles["Normal"], fontSize=11, textColor=DARK_COLOR, spaceBefore=8, spaceAfter=4, leftIndent=20)
    option_style = ParagraphStyle("Option", parent=styles["Normal"], fontSize=10, textColor=DARK_COLOR, leftIndent=40, spaceAfter=2)

    elements = []

    # ── Header ──
    elements.append(Paragraph("SMART SHIKSHA", title_style))
    elements.append(Paragraph(f"{subject} - {title}", subtitle_style))
    if test_type in ("JEE", "NEET"):
        elements.append(Paragraph(f"<b>{exam_label} Examination</b>", ParagraphStyle("PatternLabel", parent=styles["Normal"], fontSize=11, textColor=accent, alignment=TA_CENTER, spaceAfter=4)))
    elements.append(Spacer(1, 4))

    # Compute total marks from questions
    computed_marks = sum(q.get("marks", 1) for q in questions)
    display_marks = computed_marks if computed_marks > 0 else total_marks

    # Info table
    info_data = [
        [f"Class: {student_class}", f"Duration: {duration_minutes} mins", f"Total Marks: {display_marks}"],
        [f"Date: {datetime.now().strftime('%d-%m-%Y')}", f"Subject: {subject}", f"Pattern: {exam_label}"],
    ]
    info_table = Table(info_data, colWidths=[200, 200, 150])
    info_table.setStyle(TableStyle([
        ("TEXTCOLOR", (0, 0), (-1, -1), DARK_COLOR),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6))

    # ── Instructions (pattern-specific) ──
    elements.append(HRFlowable(width="100%", color=BORDER_COLOR))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("<b>General Instructions:</b>", styles["Normal"]))

    if test_type == "JEE":
        instructions = [
            "1. This paper contains MCQ and Numerical type questions.",
            "2. MCQ: +4 marks for correct, -1 for incorrect answer.",
            "3. Numerical: +4 marks for correct, no negative marking.",
            "4. Use of calculator is NOT allowed.",
            f"5. Total time allowed: {duration_minutes} minutes.",
            "6. There is no partial marking.",
        ]
    elif test_type == "NEET":
        instructions = [
            "1. This paper contains MCQ type questions only.",
            "2. Each question carries 4 marks.",
            "3. For each incorrect response, 1 mark will be deducted.",
            "4. No marks will be deducted for unattempted questions.",
            "5. Use of calculator is NOT allowed.",
            f"6. Total time allowed: {duration_minutes} minutes.",
        ]
    else:
        instructions = [
            "1. All questions are compulsory.",
            "2. Read each question carefully before answering.",
            "3. Write neat and legible answers.",
            f"4. Total time allowed: {duration_minutes} minutes.",
        ]

    for inst in instructions:
        elements.append(Paragraph(inst, ParagraphStyle("Inst", parent=styles["Normal"], fontSize=9, leftIndent=10, spaceAfter=2)))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", color=BORDER_COLOR))
    elements.append(Spacer(1, 8))

    # ── Group questions by type ──
    mcq_questions = [q for q in questions if q.get("question_type") == "MCQ"]
    short_questions = [q for q in questions if q.get("question_type") == "Short Answer"]
    numerical_questions = [q for q in questions if q.get("question_type") == "Numerical"]

    q_number = 1

    # Section A - MCQ
    if mcq_questions:
        if test_type == "JEE":
            section_title = "Section A — Multiple Choice Questions (+4, -1)"
        elif test_type == "NEET":
            section_title = "Section A — MCQs (+4 marks, -1 for wrong)"
        else:
            section_title = "Section A — Multiple Choice Questions"
        elements.append(Paragraph(section_title, section_style))
        for q in mcq_questions:
            marks = q.get("marks", 4 if test_type in ("JEE", "NEET") else 1)
            neg = " | -1 for wrong" if q.get("negative_marking") else ""
            elements.append(Paragraph(
                f"<b>Q{q_number}.</b> {q['question_text']} <i>[{marks} mark{'s' if marks > 1 else ''}{neg}]</i>",
                question_style
            ))
            if q.get("options"):
                for i, opt in enumerate(q["options"]):
                    label = chr(65 + i)
                    elements.append(Paragraph(f"({label}) {opt}", option_style))
            q_number += 1
        elements.append(Spacer(1, 8))

    # Section B - Short Answer
    if short_questions:
        elements.append(Paragraph("Section B — Short Answer Questions", section_style))
        for q in short_questions:
            marks = q.get("marks", 3)
            elements.append(Paragraph(
                f"<b>Q{q_number}.</b> {q['question_text']} <i>[{marks} marks]</i>",
                question_style
            ))
            elements.append(Spacer(1, 4))
            q_number += 1
        elements.append(Spacer(1, 8))

    # Section C - Numerical
    if numerical_questions:
        if test_type == "JEE":
            section_title = "Section B — Numerical Value Questions (No negative marking)"
        else:
            section_title = "Section C — Numerical Problems"
        elements.append(Paragraph(section_title, section_style))
        for q in numerical_questions:
            marks = q.get("marks", 4)
            elements.append(Paragraph(
                f"<b>Q{q_number}.</b> {q['question_text']} <i>[{marks} marks]</i>",
                question_style
            ))
            elements.append(Spacer(1, 4))
            q_number += 1

    # Footer
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", color=BORDER_COLOR))
    elements.append(Paragraph(
        "Generated by Smart Shiksha — AI-Powered Education for Rural India",
        ParagraphStyle("Footer", parent=styles["Normal"], fontSize=8, textColor=accent, alignment=TA_CENTER)
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
