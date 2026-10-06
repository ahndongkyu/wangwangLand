"use client"

import Image from "next/image"
import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { AnimalPhotoPicker } from "./animal-photo-picker"
import { DEFAULT_PHOTOS, eligibleAnimal, type ManagedAnimal, type SitePhotos } from "../lib/homepage"
import { saveHomeAnimals, saveSitePhotos } from "../api/homepage-actions"

const inputClass = "mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
export function HomepageManager({ initialPhotos, initialAutoFill, animals, maintenance, loadError }: { initialPhotos: SitePhotos; initialAutoFill: boolean; animals: ManagedAnimal[]; maintenance: ReactNode; loadError: string | null }) {
  const router = useRouter()
  const [tab, setTab] = useState("photos")
  const [photos, setPhotos] = useState(initialPhotos)
  const initialIds = animals.filter(a => a.is_pinned).sort((a,b) => (a.pin_order ?? 999) - (b.pin_order ?? 999)).map(a => a.id)
  const [ids, setIds] = useState(initialIds)
  const [autoFill, setAutoFill] = useState(initialAutoFill)
  const [choices, setChoices] = useState<Record<string,string>>({})
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [savedPhotos, setSavedPhotos] = useState(initialPhotos)
  const [savedHome, setSavedHome] = useState(JSON.stringify({ ids: initialIds, autoFill: initialAutoFill }))
  const photosDirty = JSON.stringify(photos) !== JSON.stringify(savedPhotos)
  const homeDirty = JSON.stringify({ ids, autoFill }) !== savedHome || Object.keys(choices).length > 0
  useEffect(() => {
    if (!photosDirty && !homeDirty && !busy) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [photosDirty, homeDirty, busy])
  const selected = ids.map(id => animals.find(a => a.id === id)).filter((a): a is ManagedAnimal => Boolean(a))
  const automatic = autoFill ? animals.filter(a => eligibleAnimal(a) && !ids.includes(a.id)).sort((a,b) => (b.rescue_date ?? "").localeCompare(a.rescue_date ?? "") || b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id)).slice(0, Math.max(0,4-selected.filter(eligibleAnimal).length)) : []
  const preview = [...selected.filter(eligibleAnimal), ...automatic].slice(0,4)
  const matches = animals.filter(a => !ids.includes(a.id) && a.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0,30)
  async function run(action: () => Promise<{ error?: string }>, done: () => void) {
    setBusy(true); setMessage(""); setError("")
    try { const result = await action(); if (result.error) setError(result.error); else { done(); setMessage("저장했습니다. 홈페이지에 반영되었습니다."); router.refresh() } }
    catch { setError("저장에 실패했습니다. 다시 시도해 주세요.") } finally { setBusy(false) }
  }
  return <div className="[&_button]:min-h-11">
    <nav aria-label="홈페이지 관리 분류" className="mb-6 flex flex-wrap gap-2">{[["photos","사이트 사진"],["animals","홈 노출 아이들"],["settings","사이트 설정"]].map(([value,label]) => <Button key={value} disabled={busy} type="button" variant={tab===value ? "default" : "outline"} aria-current={tab===value ? "page" : undefined} className="min-h-11" onClick={() => { setTab(value); setMessage(""); setError("") }}>{label}{(value === "photos" && photosDirty || value === "animals" && homeDirty) ? " · 변경됨" : ""}</Button>)}</nav>
    {loadError && <p role="alert" className="mb-5 rounded-lg bg-destructive/10 p-4 text-destructive">{loadError}</p>}
    {error && <p role="alert" className="mb-5 text-destructive">{error}</p>}
    <p role="status" className="mb-4 text-sm text-muted-foreground">{message}</p>
    <div hidden={tab!=="photos"}>
      <p className="mb-5 text-sm text-muted-foreground">사진을 올리고 표시 위치를 조정한 뒤 저장해 주세요. JPG·PNG·WebP, 최대 4MB. 기본 사진 복원도 저장 후 반영됩니다.</p>
      <div className="grid gap-6 xl:grid-cols-2">{(["banner","about"] as const).map(key => {
        const photo = photos[key]
        return <section key={key} className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold">{key === "banner" ? "홈 메인 배너" : "센터소개 사진"}</h2>
          <div className="grid grid-cols-[1fr_0.6fr] items-start gap-3">{["PC","모바일"].map((label,i) => <figure key={label}><div className={`relative overflow-hidden rounded-lg bg-muted ${key === "about" ? "aspect-[4/3]" : i === 0 ? "aspect-[1.9/1]" : "aspect-[1.3/1]"}`}><Image src={photo.src} alt={photo.alt} fill sizes="500px" style={{objectPosition:`${photo.x}% ${photo.y}%`}} className="object-cover" /></div><figcaption className="mt-1 text-xs text-muted-foreground">{label} 비율 미리보기</figcaption></figure>)}</div>
          <label className="mt-4 block text-sm">사진 교체<input disabled={busy || !!loadError} type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:text-foreground" onChange={async e => {
            const file = e.target.files?.[0]; e.target.value = ""; if (!file) return
            if (file.size > 4*1024*1024 || !["image/jpeg","image/png","image/webp"].includes(file.type)) { setError("JPG·PNG·WebP 사진을 4MB 이하로 올려 주세요."); return }
            setBusy(true); setError(""); setMessage("")
            try { const response = await fetch("/api/admin/site-photo", {method:"POST",body:file}); const data = await response.json().catch(()=>null); if (!response.ok || !data?.url) throw new Error(data?.error ?? "업로드 실패"); setPhotos(prev=>({...prev,[key]:{...prev[key],src:data.url}})); setMessage("사진을 올렸습니다. 미리보기 확인 후 사진 설정을 저장해 주세요.") }
            catch(err) { setError(err instanceof Error ? err.message : "업로드 실패") } finally { setBusy(false) }
          }}/></label>
          <label className="mt-4 block text-sm">사진 설명<input disabled={busy} maxLength={160} className={inputClass} value={photo.alt} onChange={e=>setPhotos({...photos,[key]:{...photo,alt:e.target.value}})}/></label>
          {(["x","y"] as const).map(axis=><label key={axis} className="mt-4 block text-sm">{axis === "x" ? "좌우" : "상하"} 표시 위치 · {photo[axis]}%<input disabled={busy} type="range" min={0} max={100} value={photo[axis]} className="mt-2 block min-h-11 w-full accent-primary" onChange={e=>setPhotos({...photos,[key]:{...photo,[axis]:Number(e.target.value)}})}/></label>)}
          <Button disabled={busy} type="button" variant="outline" onClick={()=>setPhotos({...photos,[key]:{...DEFAULT_PHOTOS[key]}})}>기본 사진으로 복원</Button>
        </section>
      })}</div>
      <div className="mt-5 flex gap-2"><Button disabled={busy || !!loadError || !photosDirty} onClick={()=>run(()=>saveSitePhotos(photos),()=>setSavedPhotos(photos))}>{busy ? "처리 중…" : "사진 설정 저장"}</Button><Button variant="outline" disabled={busy || !photosDirty} onClick={()=>setPhotos(savedPhotos)}>변경 취소</Button></div>
    </div>
    <fieldset disabled={busy} hidden={tab!=="animals"} className="min-w-0">
      <h2 className="text-lg font-semibold">홈 화면 미리보기 · 최대 4마리</h2>
      {ids.length > 4 && <p role="alert" className="mt-3 text-sm text-destructive">기존 고정 아이가 4마리를 초과합니다. 고정 해제하여 4마리 이하로 정리한 뒤 저장해 주세요.</p>}
      {selected.some(a => !eligibleAnimal(a)) && <p role="alert" className="mt-3 text-sm text-destructive">노출할 수 없는 아이가 고정되어 있습니다. 고정 해제 후 저장해 주세요.</p>}
      <p className="mt-2 text-sm text-muted-foreground">고정 아이가 먼저 나오고 빈자리는 자동 채움 설정에 따릅니다. 대표사진 변경은 홈·목록·상세에 함께 반영됩니다.</p>
      <div className="my-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({length:4},(_,i)=>{const animal=preview[i]; return <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">{animal ? <><div className="relative aspect-[4/3]"><Image src={choices[animal.id] ?? animal.images[animal.thumbnail_index] ?? animal.images[0]} alt={animal.name} fill sizes="250px" className="object-cover"/></div><div className="p-3"><p className="font-semibold">{i+1}. {animal.name}</p><p className="mb-2 text-xs text-muted-foreground">{ids.includes(animal.id)?"고정":"자동 채움"}</p><AnimalPhotoPicker name={animal.name} images={animal.images} index={choices[animal.id] ? animal.images.indexOf(choices[animal.id]) : animal.thumbnail_index} draft onChoose={async image=>{setChoices(prev=>({...prev,[animal.id]:image})); return undefined}}/></div></> : <p className="flex aspect-[4/3] items-center justify-center p-4 text-sm text-muted-foreground">{i+1}. 빈자리</p>}</div>})}</div>
      <label className="mb-6 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={autoFill} disabled={busy} onChange={e=>setAutoFill(e.target.checked)}/>빈자리는 사진이 있는 입양 대기 아이로 자동 채우기</label>
      <section className="rounded-xl bg-muted/40 p-4"><h3 className="mb-3 font-semibold">고정 순서 · {ids.length}/4</h3>{selected.length === 0 && <p className="text-sm text-muted-foreground">고정된 아이가 없습니다. 아래에서 선택해 주세요.</p>}{selected.map((animal,i)=><div key={animal.id} className="flex flex-wrap items-center gap-2 border-b border-border py-3 last:border-0"><span className="mr-auto text-sm">{i+1}. {animal.name} · {animal.status}{!animal.images.length && " · 사진 없음"}{!eligibleAnimal(animal) && " · 홈 노출 제외"}</span><Button variant="outline" disabled={busy||i===0} aria-label={`${animal.name} 앞으로`} onClick={()=>setIds(prev=>{const next=[...prev]; [next[i-1],next[i]]=[next[i],next[i-1]]; return next})}>앞으로</Button><Button variant="outline" disabled={busy||i===ids.length-1} aria-label={`${animal.name} 뒤로`} onClick={()=>setIds(prev=>{const next=[...prev]; [next[i+1],next[i]]=[next[i],next[i+1]]; return next})}>뒤로</Button><Button variant="outline" disabled={busy} onClick={()=>setIds(ids.filter(id=>id!==animal.id))}>고정 해제</Button></div>)}</section>
      <label className="mt-6 block text-sm">아이 이름 검색<input className={inputClass} value={query} onChange={e=>setQuery(e.target.value)} placeholder="이름으로 검색"/></label>
      <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-border">{matches.length===0 && <p className="p-4 text-sm">검색 결과가 없습니다.</p>}{matches.map(a=><div key={a.id} className="flex items-center gap-3 border-b border-border p-3 last:border-0"><span className="mr-auto text-sm">{a.name} · {a.status}{!a.images.length && " · 사진 없음"}</span><Button variant="outline" disabled={busy||ids.length>=4||!eligibleAnimal(a)} onClick={()=>setIds([...ids,a.id])}>고정 추가</Button></div>)}</div>
      <p className="mt-2 text-xs text-muted-foreground">검색 결과는 최대 30마리씩 표시합니다. 입양 대기 상태이고 사진이 있는 아이만 추가할 수 있습니다.</p>
      <div className="mt-5 flex gap-2"><Button disabled={busy || !!loadError || !homeDirty || ids.length>4 || selected.some(a=>!eligibleAnimal(a))} onClick={()=>run(()=>saveHomeAnimals(ids,autoFill,choices),()=>{setSavedHome(JSON.stringify({ids,autoFill})); setChoices({})})}>{busy?"저장 중…":"노출·대표사진 저장"}</Button><Button variant="outline" disabled={busy||!homeDirty} onClick={()=>{const previous=JSON.parse(savedHome);setIds(previous.ids);setAutoFill(previous.autoFill);setChoices({})}}>변경 취소</Button></div>
    </fieldset>
    <div hidden={tab!=="settings"}>{maintenance ?? <p className="rounded-xl bg-muted p-5 text-sm">점검 설정은 최고 관리자만 변경할 수 있습니다.</p>}</div>
  </div>
}
