from pathlib import Path
import argparse
import json
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Flowable,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Preformatted,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]

PAGE = landscape(letter)
MARGIN = 0.48 * inch
CYAN = colors.HexColor("#62D8F4")
PURPLE = colors.HexColor("#A66BEA")
YELLOW = colors.HexColor("#FFD13B")
INK = colors.HexColor("#152027")
MUTED = colors.HexColor("#53636D")
PANEL = colors.HexColor("#F2F6F7")
GRID = colors.HexColor("#B8C7CD")
COLECO_COLORS = ["#B766B5", "#DB6559", "#FF897D", "#DED087", "#74D07D", "#8076F1"]


class SquarePortrait(Flowable):
    def __init__(self, path, size=0.48 * inch):
        super().__init__()
        self.path = path
        self.width = size
        self.height = size

    def draw(self):
        image = ImageReader(str(self.path))
        width, height = image.getSize()
        scale = max(self.width / width, self.height / height)
        draw_width = width * scale
        draw_height = height * scale
        self.canv.saveState()
        clip = self.canv.beginPath()
        clip.rect(0, 0, self.width, self.height)
        self.canv.clipPath(clip, stroke=0, fill=0)
        self.canv.drawImage(
            image,
            (self.width - draw_width) / 2,
            (self.height - draw_height) / 2,
            draw_width,
            draw_height,
            mask="auto",
        )
        self.canv.restoreState()
        self.canv.setStrokeColor(GRID)
        self.canv.rect(0, 0, self.width, self.height, stroke=1, fill=0)


def inline(text):
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        r'<link href="\2" color="#057F99"><u>\1</u></link>',
        text,
    )
    text = re.sub(r"`([^`]+)`", r'<font name="Courier-Bold" color="#334A57">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", text)
    return text


def colecovision_word():
    return "".join(
        f'<font color="{COLECO_COLORS[index % len(COLECO_COLORS)]}">{letter}</font>'
        for index, letter in enumerate("COLECOVISION")
    )


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="ReportTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25, leading=29, textColor=PURPLE, alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle(name="Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=11, leading=15, textColor=MUTED, alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=31, leading=36, textColor=PURPLE, alignment=TA_CENTER, spaceAfter=12))
styles.add(ParagraphStyle(name="CoverWord", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=35, leading=39, alignment=TA_CENTER, spaceAfter=3))
styles.add(ParagraphStyle(name="CoverSubject", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=24, leading=29, textColor=colors.HexColor("#D9E2E5"), alignment=TA_CENTER, spaceAfter=15))
styles.add(ParagraphStyle(name="CoverVersion", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=CYAN, alignment=TA_CENTER, spaceAfter=18))
styles.add(ParagraphStyle(name="CoverBody", parent=styles["Normal"], fontName="Helvetica", fontSize=11, leading=16, textColor=colors.HexColor("#D9E2E5"), alignment=TA_CENTER, leftIndent=0.8 * inch, rightIndent=0.8 * inch, spaceAfter=10))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=PURPLE, spaceBefore=10, spaceAfter=7, keepWithNext=True))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=16, textColor=colors.HexColor("#057F99"), spaceBefore=8, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="H3x", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=INK, spaceBefore=6, spaceAfter=4, keepWithNext=True))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.7, leading=12, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name="Bulletx", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.5, leading=11.5, leftIndent=13, firstLineIndent=-8, bulletIndent=2, textColor=INK, spaceAfter=3))
styles.add(ParagraphStyle(name="Cell", parent=styles["BodyText"], fontName="Helvetica", fontSize=6.6, leading=8.2, textColor=INK))
styles.add(ParagraphStyle(name="GalleryCell", parent=styles["BodyText"], fontName="Helvetica", fontSize=6.0, leading=7.1, textColor=INK))
styles.add(ParagraphStyle(name="CellHead", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=6.5, leading=8, textColor=colors.white))
styles.add(ParagraphStyle(name="CodeX", parent=styles["Code"], fontName="Courier", fontSize=6.8, leading=8.5, leftIndent=8, rightIndent=8, backColor=colors.HexColor("#E8EEF0"), borderPadding=5, spaceAfter=6))
styles.add(ParagraphStyle(name="SampleCode", parent=styles["Code"], fontName="Courier", fontSize=7.2, leading=8.6, backColor=colors.HexColor("#EDF5F7"), textColor=colors.HexColor("#10262E"), borderColor=colors.HexColor("#A8C6D0"), borderWidth=0.5, borderPadding=7, spaceAfter=7))

PAGE_TOP_HEADINGS = {
    "SDCC allocator-budget audit",
    "Real occupied size, excluding cartridge padding",
    "Maximum native optimization used",
    "Runtime and comparability verdict",
    "Graphics II bitmap compression corpus",
    "Preliminary capability matrix",
    "Detailed language and runtime evidence",
    "Compression evidence",
    "Memory, ROM size, and banking",
    "Development experience",
    "Next measurement suite",
    "Controller fixture ROM results",
    "Amy Studio: next work",
}


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = PAGE
    if doc.page == 1:
        canvas.setFillColor(colors.HexColor("#071317"))
        canvas.rect(0, 0, width, height, stroke=0, fill=1)
        canvas.setFillColor(CYAN)
        canvas.rect(0, height - 0.16 * inch, width, 0.16 * inch, stroke=0, fill=1)
        canvas.setFillColor(PURPLE)
        canvas.rect(0, 0, width, 0.12 * inch, stroke=0, fill=1)
        canvas.restoreState()
        return
    canvas.setFillColor(colors.HexColor("#091318"))
    canvas.rect(0, height - 0.25 * inch, width, 0.25 * inch, stroke=0, fill=1)
    canvas.setFillColor(CYAN)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(MARGIN, height - 0.17 * inch, "AMY STUDIO  /  COLECOVISION TOOLCHAIN COMPARISON")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawRightString(width - MARGIN, 0.24 * inch, f"NOVEMBER 2026   |   {doc.page}")
    canvas.restoreState()


def make_table(rows, available_width):
    count = max(len(row) for row in rows)
    normalized = [row + [""] * (count - len(row)) for row in rows]
    cells = []
    for row_index, row in enumerate(normalized):
        style = styles["CellHead"] if row_index == 0 else styles["Cell"]
        cells.append([Paragraph(inline(cell), style) for cell in row])
    if normalized[0][:3] == ["Sample", "Runtime result", "Verdict"]:
        weights = [1.0, 2.25, 1.35]
    elif normalized[0][:3] == ["Solution", "Setting used", "Observation"]:
        weights = [0.62, 1.48, 1.45]
    elif normalized[0][:3] == ["Extension", "Verified or documented advantage", "Scope in this comparison"]:
        weights = [0.72, 1.5, 1.38]
    elif normalized[0][:3] == ["Rank", "Open work", "Status"]:
        weights = [0.28, 1.72, 1.48, 0.62, 0.58, 0.58]
    elif normalized[0][0] in {"Area", "Capability"} and count >= 6:
        weights = [0.82] + [1.0] * (count - 1)
    elif normalized[0][:3] == ["Solution", "Primary approach", "ColecoVision position"]:
        weights = [0.72, 1.18, 1.5]
    elif normalized[0][:3] == ["Solution", "Confirmed formats", "Direct VRAM status"]:
        weights = [0.68, 1.48, 1.35, 1.0]
    elif normalized[0][:3] == ["Candidate", "Honest Amy name", "Current evidence"]:
        weights = [0.68, 0.95, 1.58, 1.35]
    elif normalized[0][:3] == ["Role", "Picture", "Best ratio"]:
        weights = [0.78, 1.35, 0.72]
    elif normalized[0][:2] == ["Rank", "Codec"]:
        weights = [0.34, 1.12] + [0.82] * (count - 2)
    elif normalized[0][:3] == ["Sample", "Pure ASM", "Amy Studio"]:
        weights = [0.92, 0.72, 0.76, 0.82]
    else:
        weights = [1.25] + [1.0] * (count - 1)
    total = sum(weights)
    widths = [available_width * weight / total for weight in weights]
    table = Table(cells, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#13232B")),
        ("GRID", (0, 0), (-1, -1), 0.35, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PANEL]),
    ]))
    # Compact evidence tables are easier to read intact than repeated across a page turn.
    # Larger matrices may still split by row and repeat their header normally.
    return KeepTogether([table]) if len(normalized) <= 10 else table


def parse_markdown(text, available_width):
    lines = text.splitlines()
    flow = []
    paragraph = []
    index = 1  # The PDF cover supplies the document title.

    def flush_paragraph():
        if paragraph:
            flow.append(Paragraph(inline(" ".join(part.strip() for part in paragraph)), styles["Bodyx"]))
            paragraph.clear()

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            index += 1
            continue
        if stripped.startswith("```"):
            flush_paragraph()
            code = []
            index += 1
            while index < len(lines) and not lines[index].strip().startswith("```"):
                code.append(lines[index])
                index += 1
            flow.append(Paragraph("<br/>".join(inline(item).replace(" ", "&nbsp;") for item in code), styles["CodeX"]))
            index += 1
            continue
        if stripped.startswith("|") and index + 1 < len(lines) and re.match(r"^\s*\|?\s*:?-+", lines[index + 1]):
            flush_paragraph()
            rows = []
            rows.append([cell.strip() for cell in stripped.strip("|").split("|")])
            index += 2
            while index < len(lines) and lines[index].strip().startswith("|"):
                rows.append([cell.strip() for cell in lines[index].strip().strip("|").split("|")])
                index += 1
            flow.extend([make_table(rows, available_width), Spacer(1, 7)])
            continue
        heading = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            level = len(heading.group(1))
            title = heading.group(2)
            style = styles[{1: "H1x", 2: "H2x", 3: "H3x"}[level]]
            if (level == 1 and flow) or title in PAGE_TOP_HEADINGS:
                flow.append(PageBreak())
            flow.append(Paragraph(inline(title), style))
            index += 1
            continue
        bullet = re.match(r"^[-*]\s+(.+)$", stripped)
        numbered = re.match(r"^\d+\.\s+(.+)$", stripped)
        if bullet or numbered:
            flush_paragraph()
            marker = "-" if bullet else stripped.split(".", 1)[0] + "."
            body = (bullet or numbered).group(1)
            flow.append(Paragraph(inline(body), styles["Bulletx"], bulletText=marker))
            index += 1
            continue
        paragraph.append(stripped)
        index += 1
    flush_paragraph()
    return flow


def without_generated_corpus_section(text):
    """The PDF already renders this table and gallery directly from benchmark JSON."""
    pattern = re.compile(
        r"\n### Graphics II bitmap compression corpus\n.*?(?=\n### Observations supported by this suite\n)",
        re.DOTALL,
    )
    cleaned, count = pattern.subn("\n", text, count=1)
    if count != 1:
        raise ValueError("Graphics II bitmap compression corpus section was not found exactly once")
    return cleaned


def amy_sample_pages(screenshot_dir):
    samples = [
        (
            "Hello World",
            ROOT / "competition" / "benchmarks" / "hello-world" / "amy-hello.alexis",
            screenshot_dir / "amy-hello.png",
            None,
            "GearColeco output after 180 NTSC frames",
        ),
        (
            "Warrior Graphics II Bitmap",
            ROOT / "build" / "competition" / "bitmap-picture" / "generated" / "amy-bitmap.alexis",
            screenshot_dir / "amy-warrior.png",
            None,
            "Exact GearColeco output; all eight tools reproduce the same target image",
        ),
        (
            "Visual Controller Input",
            ROOT / "competition" / "benchmarks" / "controller-input" / "amy-controller-visual.alexis",
            screenshot_dir / "amy-controller.png",
            None,
            "GearColeco output at the neutral controller state",
        ),
        (
            "Animated Three-Color Metasprite",
            ROOT / "competition" / "benchmarks" / "sprite-metasprite" / "amy-sprite-metasprite.alexis",
            screenshot_dir / "amy-sprite-metasprite.png",
            None,
            "A metasprite is one visual actor assembled here from three overlapping hardware sprites",
        ),
        (
            "Gameplay State Update",
            ROOT / "competition" / "benchmarks" / "state-update" / "amy-state-update.alexis",
            screenshot_dir / "amy-state-update.png",
            None,
            "Experimental: 1,156 occupied bytes; exact oracle: state 1, collisions 13, score 425, checksum 1478",
        ),
        (
            "Graphics II Tile Animation",
            ROOT / "competition" / "benchmarks" / "tile-animation" / "amy-tile-animation.alexis",
            screenshot_dir / "amy-studio-tile-animation.png",
            None,
            "Experimental: 1,316 occupied bytes; continuous shared-pattern and six-ship Name Table animation verified",
        ),
    ]
    flow = [Paragraph("Amy Studio source and GearColeco results", styles["H1x"])]
    flow.append(Paragraph("Listings are complete except for bulky sprite patterns and the state-update engine body; both complete sources are in the evidence archive. Screenshots come from GearColeco running each measured ROM for 180 NTSC frames; current integrated debugging uses GearColeco 1.7.0.", styles["Bodyx"]))
    for sample_index, (title, source, screenshot, reference, caption) in enumerate(samples):
        for required in (source, screenshot):
            if not required.exists():
                raise FileNotFoundError(required)
        if sample_index:
            flow.append(PageBreak())
        flow.append(Paragraph(title, styles["H2x"]))
        source_text = source.read_text(encoding="utf-8").rstrip()
        if title == "Animated Three-Color Metasprite":
            source_text = """u8 PlayerX = 120
u8 PlayerY = 88
u8 AnimationTick = 0
u8 AnimationFrame = 0

data PlayerMeta metasprite layers 3
  frame 0,15, 4,11, 8,1
  frame 12,15, 16,11, 20,1
end data

' Six 16x16 pattern blocks are included in the evidence archive.
sprites simple
set sprite count 3

MainLoop:
  wait
  if joypad(1).left and PlayerX > 1 then PlayerX -= 1
  if joypad(1).right and PlayerX < 239 then PlayerX += 1
  if joypad(1).up and PlayerY > 1 then PlayerY -= 1
  if joypad(1).down and PlayerY < 175 then PlayerY += 1
  AnimationTick += 1
  if AnimationTick = 8 then
    AnimationTick = 0
    AnimationFrame = 1 - AnimationFrame
  end if
  set metasprite PlayerMeta frame AnimationFrame to PlayerY,PlayerX using sprite 0
  update sprites
  goto MainLoop"""
        elif title == "Gameplay State Update":
            source_text = """record ActorState:
  u8 X
  u8 Y
  u8 Direction
  u8 Timer
  u8 Mode
  u8 Hits
end record

state machine WorldBehavior:
  Running calls UpdateActors
  Bonus calls UpdateBonus
end state machine

ActorState Actors[6]
u16 Score = 0
u16 Checksum = 0

for Tick = 0 to 47
  dispatch WorldMode using WorldBehavior
next

sub UpdateActors:
  for each Actor, ActorIndex in Actors
    ' Movement, timers, modes, collision and score updates.
  next Actor
  if Tick = 23 then WorldMode = WorldBehavior.Bonus
  return"""
        elif title == "Graphics II Tile Animation":
            source_text = """const StarTile = $80
const ShipFirstTile = $90
u8 StarFrame = 0
u8 ShipFrame = 0

tile screen
backdrop black
nmi off
' Install shared star and two 3x2 ship frames in all Graphics II thirds.
copy StarPattern0 count 8 to vram.pattern + StarTile * 8
copy ShipPatterns count 96 to vram.pattern + ShipFirstTile * 8
copy ShipColors count 96 to vram.color + ShipFirstTile * 8
nmi on

AnimationLoop:
  wait
  Tick += 1
  if Tick & 3 = 0 then
    ' Replace one shared pattern: every star animates together.
    StarFrame = (StarFrame + 1) % 3
    copy StarPatterns[StarFrame * 8] count 8 to vram.pattern + StarTile * 8
  end if
  if Tick & 7 = 0 then
    ' Replace six 3x2 Name Table frames without moving the ships.
    ShipFrame = 1 - ShipFrame
    for Ship = 0 to 5
      put ShipTiles[ShipFrame * 6] frame size 3,2 at ShipX[Ship],ShipY[Ship]
    next
  end if
goto AnimationLoop"""
        flow.append(Preformatted(source_text, styles["SampleCode"]))
        image_width = 3.0 * inch
        images = [Image(str(screenshot), width=image_width, height=image_width * 0.75)]
        labels = [Paragraph("GearColeco screenshot", styles["Subtitle"])]
        if reference:
            if not reference.exists():
                raise FileNotFoundError(reference)
            images.append(Image(str(reference), width=3.55 * inch, height=2.6625 * inch))
            labels.append(Paragraph("Source bitmap", styles["Subtitle"]))
        image_table = Table([images, labels], colWidths=[4.05 * inch] * len(images), hAlign="CENTER")
        image_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("BOX", (0, 0), (-1, 0), 0.6, GRID),
            ("INNERGRID", (0, 0), (-1, 0), 0.4, GRID),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#091318")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        flow.extend([image_table, Spacer(1, 4), Paragraph(caption, styles["Subtitle"])])
    flow.append(PageBreak())
    return flow


def pure_asm_reference_page(screenshot_dir):
    source = ROOT / "competition" / "benchmarks" / "hello-world" / "asm-hello-world-2010.asm"
    screenshot = screenshot_dir / "asm-hello-world-2010.png"
    for required in (source, screenshot):
        if not required.exists():
            raise FileNotFoundError(required)
    listing_lines = [line for line in source.read_text(encoding="utf-8").splitlines() if line.strip()]
    midpoint = (len(listing_lines) + 1) // 2
    listing_start = "\n".join(listing_lines[:midpoint])
    listing_end = "\n".join(listing_lines[midpoint:])
    screenshot_frame = Table(
        [[Image(str(screenshot), width=3.1 * inch, height=2.325 * inch)]],
        colWidths=[3.1 * inch],
        rowHeights=[2.325 * inch],
    )
    screenshot_frame.setStyle(TableStyle([
        ("BOX", (0, 0), (0, 0), 0.6, GRID),
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#091318")),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("RIGHTPADDING", (0, 0), (0, 0), 0),
        ("TOPPADDING", (0, 0), (0, 0), 0),
        ("BOTTOMPADDING", (0, 0), (0, 0), 0),
    ]))
    return [
        Paragraph("Pure Z80 assembly reference", styles["H1x"]),
        Paragraph(
            "Amy Bienvenu published this BIOS-based Hello World on AtariAge in 2010 under the name "
            "Daniel Bienvenu. Amy's assembler builds it without optimization, and GearColeco verifies "
            "the exact VRAM text after BIOS startup. It occupies 184 bytes.",
            styles["Bodyx"],
        ),
        Table([[Preformatted(listing_start, styles["SampleCode"]), screenshot_frame]],
              colWidths=[6.15 * inch, 3.25 * inch], hAlign="CENTER",
              style=TableStyle([
                  ("VALIGN", (0, 0), (-1, -1), "TOP"),
                  ("LEFTPADDING", (0, 0), (-1, -1), 4),
                  ("RIGHTPADDING", (0, 0), (-1, -1), 4),
              ])),
        PageBreak(),
        Paragraph("Pure Z80 assembly reference - continued", styles["H2x"]),
        Preformatted(listing_end, styles["SampleCode"]),
        Paragraph(
            "Bienvenu also authored NewColeco. As the AtariAge discussion noted, this compact listing "
            "reuses the ColecoVision BIOS font and VDP routines; a private font and runtime would be "
            "more independent but larger. Matching hand-written ASM versions now cover all six "
            "fixtures and pass their GearColeco oracles. Together they occupy 5,126 bytes versus "
            "7,372 for Amy Studio, a 2,246-byte difference. The current build includes VDP-critical NMI deferral and a bounded frame-wait fallback; the latter prevents a reproducible missed-NMI stall.",
            styles["Bodyx"],
        ),
        Paragraph(
            "The controller ROM fell from 297 to 264 bytes by replacing CONT_SCAN plus a 16-byte "
            "keypad table with two BIOS DECODER calls and by storing only the final display color. "
            "POLLER remains appropriate when two-sample debounce is required, but its 12-byte result "
            "contract and 83-91 executed BIOS instructions per call do not improve this fixture; one "
            "DECODER segment takes 29 instructions.",
            styles["Bodyx"],
        ),
        PageBreak(),
    ]


def compression_corpus_pages():
    report_path = ROOT / "competition" / "benchmarks" / "compression" / "bitmap-codec-ratios.json"
    if not report_path.exists():
        raise FileNotFoundError(report_path)
    report = json.loads(report_path.read_text(encoding="utf-8"))
    names = report["names"]
    codec_ids = [codec for codec in report["columns"] if codec not in ("raw", "zx0classic")]
    rows = report["rows"]
    flow = [
        Paragraph("Graphics II compression corpus", styles["H1x"]),
        Paragraph(
            f"All {len(rows)} unique 12,288-byte pictures passed exact round-trip checks with every codec. "
            "The gallery shows the actual TMS9918 output and the five smallest payloads for every picture. "
            "UPKR is charged its independently validated 221-byte small VRAM decoder; Amy compiler integration remains pending. "
            "An asterisk marks the two codecs needing a large temporary decode buffer: UPKR needs about 322 aligned bytes and "
            "Exomizer 2 needs 156 aligned bytes. The other ranked codecs do not require an equivalent buffer.",
            styles["Bodyx"],
        ),
    ]
    aggregate_rows = [
        ["Rank", "Codec", "Payload total", "Decoder", "First-use places (pictures)", "", "", "", "", ""],
        ["", "", "", "", "1st", "2nd", "3rd", "4th", "5th", "6th"],
    ]
    for rank, item in enumerate(report["aggregate"], 1):
        aggregate_rows.append([
            str(rank), item["codec"], f'{item["totalBytes"]:,}',
            str(item["decoderBytes"]) if item["decoderBytes"] is not None else "n/a", str(item["firstPlaces"]),
            str(item["secondPlaces"]), str(item["thirdPlaces"]),
            str(item["fourthPlaces"]), str(item["fifthPlaces"]), str(item["sixthPlaces"]),
        ])
    table_width = PAGE[0] - 2 * MARGIN
    weights = [0.55, 1.4, 1.15, 0.75, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
    total_weight = sum(weights)
    aggregate_cells = [
        [Paragraph(inline(cell), styles["CellHead"] if row_index < 2 else styles["Cell"]) for cell in row]
        for row_index, row in enumerate(aggregate_rows)
    ]
    aggregate_table = Table(
        aggregate_cells,
        colWidths=[table_width * weight / total_weight for weight in weights],
        repeatRows=2,
        hAlign="LEFT",
    )
    aggregate_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 1), colors.HexColor("#13232B")),
        ("GRID", (0, 0), (-1, -1), 0.35, GRID),
        ("SPAN", (0, 0), (0, 1)),
        ("SPAN", (1, 0), (1, 1)),
        ("SPAN", (2, 0), (2, 1)),
        ("SPAN", (3, 0), (3, 1)),
        ("SPAN", (4, 0), (9, 0)),
        ("ALIGN", (4, 0), (9, 1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 2), (-1, -1), [colors.white, PANEL]),
    ]))
    flow.extend([aggregate_table, PageBreak()])

    cards = []
    for row in rows:
        preview = ROOT / "competition" / "benchmarks" / "compression" / "corpus-previews" / f'{row["id"]}.png'
        if not preview.exists():
            raise FileNotFoundError(preview)
        unique = {}
        for codec in codec_ids:
            label = names[codec]
            candidate = (row["sizes"][codec], label)
            if label not in unique or candidate[0] < unique[label][0]:
                unique[label] = candidate
        ranked = sorted(unique.values(), key=lambda item: (item[0], item[1]))
        top_five = ranked[:5]
        ranking = "<br/>".join(
            f"{rank}. {inline(label)}: {size:,} bytes"
            for rank, (size, label) in enumerate(top_five, 1)
        )
        details = Paragraph(
            f'<b>{inline(row["picture"])}</b>'
            + (f'<br/><font color="#53636D">{inline(row["author"])}</font>' if row.get("author") else "")
            + f'<br/>{ranking}',
            styles["GalleryCell"],
        )
        if row.get("portrait"):
            portrait_files = {"newcoleco": "newcoleco.jfif", "mermaid": "mermaid.jpg", "alekmaul": "alekmaul.png"}
            portrait_path = ROOT / "competition" / "benchmarks" / "compression" / "authors" / portrait_files[row["portrait"]]
            if not portrait_path.exists():
                raise FileNotFoundError(portrait_path)
            details = Table([[details, SquarePortrait(portrait_path)]], colWidths=[1.48 * inch, 0.48 * inch])
            details.setStyle(TableStyle([
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]))
        card = Table([
            [Image(str(preview), width=1.92 * inch, height=1.44 * inch)],
            [details],
        ], colWidths=[2.32 * inch])
        card.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.45, GRID),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#091318")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, 0), 4),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 5),
            ("TOPPADDING", (0, 1), (-1, 1), 5),
            ("BOTTOMPADDING", (0, 1), (-1, 1), 4),
        ]))
        cards.append(card)

    for start in range(0, len(cards), 6):
        chunk = cards[start:start + 6]
        while len(chunk) < 6:
            chunk.append(Spacer(1, 1))
        # Keep continuation-page headings below the fixed report header.
        if start:
            flow.append(Spacer(1, 0.24 * inch))
        flow.append(Paragraph(f"Corpus gallery {start + 1}-{min(start + 6, len(cards))}", styles["H2x"]))
        gallery = Table(
            [chunk[:3], [Spacer(1, 0.18 * inch)] * 3, chunk[3:]],
            colWidths=[3.05 * inch] * 3,
            rowHeights=[None, 0.18 * inch, None],
            hAlign="CENTER",
        )
        gallery.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        flow.append(gallery)
        flow.append(PageBreak())
    return flow


def build(source, chart, screenshots, output):
    if not source.exists():
        raise FileNotFoundError(source)
    if not chart.exists():
        raise FileNotFoundError(chart)
    output.parent.mkdir(parents=True, exist_ok=True)
    width, height = PAGE
    frame = Frame(MARGIN, 0.38 * inch, width - 2 * MARGIN, height - 1.10 * inch, id="main")
    doc = BaseDocTemplate(str(output), pagesize=PAGE, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=0.34 * inch, bottomMargin=0.38 * inch, title="Amy Studio ColecoVision Toolchain Comparison", author="Amy Bienvenu")
    doc.addPageTemplates(PageTemplate(id="report", frames=[frame], onPage=header_footer))

    from PIL import Image as PilImage
    chart_pixels = PilImage.open(chart).size
    chart_width = width - 0.95 * inch
    chart_height = chart_width * chart_pixels[1] / chart_pixels[0]
    max_chart_height = 5.38 * inch
    if chart_height > max_chart_height:
        chart_height = max_chart_height
        chart_width = chart_height * chart_pixels[0] / chart_pixels[1]
    cover = [
        Spacer(1, 1.15 * inch),
        Paragraph("AMY STUDIO", styles["CoverVersion"]),
        Paragraph(colecovision_word(), styles["CoverWord"]),
        Paragraph("TOOLCHAIN COMPARISON", styles["CoverSubject"]),
        Paragraph("Version November 23, 2026", styles["CoverVersion"]),
        Spacer(1, 0.22 * inch),
        Paragraph("Measured ROM size, runtime validation, graphics compression, capabilities, and development tradeoffs across nine ColecoVision approaches.", styles["CoverBody"]),
        Spacer(1, 0.18 * inch),
        Paragraph("Six reproducible game-development fixtures. Complete source, ROM, hash, and emulator evidence.", styles["CoverBody"]),
        Spacer(1, 0.42 * inch),
        Paragraph("Amy Bienvenu", styles["CoverVersion"]),
        PageBreak(),
        Paragraph("Six benchmark cases", styles["ReportTitle"]),
        Paragraph("Each panel uses its own scale so the relative cost of every toolchain remains readable.", styles["Subtitle"]),
        Image(str(chart), width=chart_width, height=chart_height, hAlign="CENTER"),
        Spacer(1, 3),
        Paragraph("Occupied ROM size excludes cartridge padding. Lower is smaller, not automatically faster or better.", styles["Subtitle"]),
        PageBreak(),
    ]
    markdown = without_generated_corpus_section(source.read_text(encoding="utf-8"))
    story = cover + amy_sample_pages(screenshots) + pure_asm_reference_page(screenshots) + compression_corpus_pages() + parse_markdown(markdown, width - 2 * MARGIN)
    doc.build(story)
    print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--chart", type=Path, required=True)
    parser.add_argument("--screenshots", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "output" / "pdf" / "amy-studio-colecovision-toolchain-comparison.pdf")
    args = parser.parse_args()
    build(args.source.resolve(), args.chart.resolve(), args.screenshots.resolve(), args.output.resolve())
