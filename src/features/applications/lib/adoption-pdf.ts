import { PDFDocument, rgb, type PDFPage } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import type { AdoptionRow } from "../api/queries"
import { adoptionQuestions, adoptionTerms } from "./adoption-document-content"
import { ADOPTION_CONTACT, ADOPTION_CONTACT_LABEL, adoptionVisitLabel } from "./adoption-workflow"

/** 텍스트를 이미지로 만들지 않아 검색/복사 가능하며 긴 답변은 페이지를 넘겨 보존한다. */
export async function generateAdoptionPdf(app: AdoptionRow, fontBytes: Uint8Array, boldBytes = fontBytes, contactPhone = ADOPTION_CONTACT) {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const font = await doc.embedFont(fontBytes, { subset: true })
  // 굵은 한글의 복합 글리프가 일부 PDF 뷰어에서 누락되지 않도록 원본을 포함한다.
  const bold = await doc.embedFont(boldBytes)
  const glyphs = new Set(font.getCharacterSet())
  const safe = (value: string) => [...value.replace(/\r\n?/g, "\n")].map(c => c === "\n" || glyphs.has(c.codePointAt(0)!) ? c : `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`).join("")
  let page: PDFPage
  let y = 0
  let title = "입양상담 사전정보"
  const left = 40, width = 515, ink = rgb(.15,.16,.14), muted = rgb(.36,.38,.33), border = rgb(.76,.78,.73)
  function draw(text: string, x: number, top: number, size = 10, color = ink, strong = false) {
    page.drawText(safe(text), { x, y: top, size, font: strong ? bold : font, color })
  }
  function line(top: number, x = left, length = width) {
    page.drawLine({ start: { x, y: top }, end: { x: x+length, y: top }, thickness: .5, color: border })
  }
  function newPage(nextTitle = title, continued = false) {
    title = nextTitle
    page = doc.addPage([595.28,841.89])
    draw("왕왕랜드  유기견 보호소",left,804,11)
    line(790)
    draw(title+(continued ? " (계속)" : ""),left,760,22,ink,true)
    y = 733
  }
  function ensure(height: number) { if (y-height<53) newPage(title,true) }
  function wrap(text: string, maxWidth = width, size=10) {
    const rows: string[]=[]
    for (const part of safe(text).split("\n")) {
      let row=""
      for (const char of part) {
        if (row && font.widthOfTextAtSize(row+char,size)>maxWidth && !/[.,!?]/.test(char)) { rows.push(row);row="" }
        row+=char
      }
      rows.push(row)
    }
    return rows
  }
  function paragraph(text: string, size=10, inset=0, gap=5) {
    for (const row of wrap(text,width-inset,size)) {ensure(15);draw(row,left+inset,y,size);y-=14}
    y-=gap
  }
  function heading(text: string) {ensure(57);y-=10;draw(text,left,y,11,ink,true);y-=17;line(y+5);y-=10}
  function row(label: string, value: string | null | undefined) {
    const rows=wrap(value ?? "미입력",width-110)
    for(let i=0;i<rows.length;i++) {
      ensure(24)
      page.drawRectangle({x:left,y:y-11,width:100,height:22,color:rgb(.97,.97,.96)})
      if(i===0)draw(label,left+5,y,9,muted)
      draw(rows[i],left+110,y);y-=14
    }
    y-=8;line(y+11)
  }
  function choices() { ensure(20);for (const [index,label] of ["네","아니오"].entries()) { page.drawRectangle({x:left+20+index*66,y:y-1,width:7,height:7,borderWidth:.5,borderColor:muted});draw(label,left+32+index*66,y,9) }y-=18 }
  function blank(label="") {ensure(27);if(label)draw(label,left+20,y,9);line(y-7,left+20,width-20);y-=25}
  newPage()
  paragraph("홈페이지에서 입력한 정보를 상담 시 확인하기 위한 자료입니다.",9)
  row("확정 방문 일정",adoptionVisitLabel(app.confirmed_visit_at))
  row("처음 희망한 아이",app.dog?.name ?? app.cat?.name ?? app.preferred_animal ?? "상담 후 결정")
  paragraph("희망한 아이는 상담 참고 정보이며, 실제 입양할 아이는 현장에서 결정합니다.",8)
  heading("01  신청자 정보")
  row("이름",app.applicant_name);row("연락처",app.phone);row("주소",app.address)
  heading("02  가족과 생활 환경")
  row("가족 / 어린이 동거",`${app.family_size ?? "미입력"}명 / ${app.has_children == null ? "미입력" : app.has_children ? "있음" : "없음"}`)
  row("주거 형태 / 소유",`${app.housing_type ?? "미입력"} / ${app.ownership_type ?? "미입력"}`)
  row("현재 반려동물",app.current_pets)
  heading("03  양육 경험과 입양 이유")
  row("이전 양육 경험",app.past_pet_experience);row("입양 이유",app.reason)
  heading("04  신청 당시 희망 일정 및 동의")
  row("방문 가능일",app.visit_available_dates.join(", ") || "미입력")
  row("방문 가능 시간",app.visit_available_time)
  row("개인정보 동의",app.privacy_agreed ? "동의함" : "동의 기록 없음")
  if(app.qualification_answers) {
    const labels: Record<string,string>={adult:"성인 확인",family_consent:"가족 전원 동의",readiness:"평생 양육 여건",terms_agreed:"이용약관 동의",landlord_consent:"임대인 동의"}
    row("신청 시 확인사항",Object.entries(app.qualification_answers).map(([k,v])=>`${labels[k] ?? k}: ${v ? "확인" : "미확인"}`).join(" / "))
  } else row("신청 시 확인사항","과거 신청으로 개별 확인 기록 없음")
  paragraph(`서류를 함께 출력해 준비해주세요. 작성·서명은 현장 상담 후 진행합니다.\n${ADOPTION_CONTACT_LABEL}: ${contactPhone}`,9)
  newPage("입양 설문지")
  paragraph("현장 상담 후 작성해주세요.",9)
  adoptionQuestions.forEach((question,index)=>{
    ensure(wrap(question,width-20).length*14 + (index===0?72:index===5?65:42))
    paragraph(`${String(index+1).padStart(2,"0")}  ${question}`,10,0,3)
    if (![1,6].includes(index)) choices()
    if(index===0){blank("있다면 어떤 동물을 몇 마리 키우셨습니까?");blank("그 동물의 현재 상태는 어떠합니까?")}
    if(index===1 || index===6)blank()
    if(index===3)blank("교육 이수 과정은?")
    if(index===5){paragraph("아니라면 반려동물과 동거하는 것에 대하여 집주인의 허락을 받았습니까?",9,20,2);choices()}
    line(y+3);y-=7
  })
  newPage("입양 신청서")
  paragraph("현장 상담 후 실제 입양할 아이를 기준으로 작성·서명해주세요.",9)
  heading("01  입양 신청자 정보")
  function fields(labels: string[]) {
    ensure(37);const col=width/labels.length
    labels.forEach((label,i)=>draw(label,left+i*col+5,y,9,muted));y-=30;line(y+11)
  }
  fields(["성명 / 성별","연락처"]);fields(["카페 닉네임"]);fields(["실거주 주소"])
  heading("02  입양 동물 정보")
  fields(["동물종류/품종","이름"]);fields(["성별","중성화 여부"]);fields(["동물등록여부","등록번호"])
  heading("03  입양자 필수 준수 사항")
  adoptionTerms.forEach((term,i)=>paragraph(`${i+1}. ${term}`,9.5,0,4))
  ensure(100);line(y);y-=23
  paragraph("위 내용을 모두 확인 하고 동의 합니다.",10,130)
  paragraph("20        년        월        일",10,175)
  y-=8;paragraph("입양 신청인 : ____________________ (서명)",10,225)
  y-=6;paragraph("입양 상담자 : ____________________ (서명)",10,225)
  const pages=doc.getPages()
  pages.forEach((p,i)=>{page=p;draw("왕왕랜드 · 입양상담 방문 서류 / 개인정보 포함",left,28,8,muted);draw(`${i+1} / ${pages.length}`,520,28,8,muted)})
  doc.setTitle("왕왕랜드 입양상담 방문 서류");doc.setAuthor("왕왕랜드")
  return doc.save()
}
