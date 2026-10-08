import Image from "next/image"
import Link from "next/link"
import { ImageIcon } from "lucide-react"
import type { Cat, Dog } from "@/shared/types/database"
import { Pagination } from "@/shared/components/pagination"
import { SearchBox } from "@/shared/components/search-box"
import { buttonVariants } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { QuickAnimalPhoto } from "@/features/settings/components/animal-photo-picker"
import { AnimalRowMenu, AnimalStatusSelect } from "./animal-row-controls"
import { AnimalQuerySelect } from "./animal-query-select"
import { ANIMAL_GENDERS, ANIMAL_SIZES, ANIMAL_STATUSES, animalFilterParams, animalListHref, type AnimalKind, type parseAnimalFilters } from "../lib/admin-filters"

export function AdminAnimalList({ kind, animals, total, filters, canDelete }: {
  kind: AnimalKind; animals: (Dog | Cat)[]; total: number
  filters: ReturnType<typeof parseAnimalFilters>; canDelete: boolean
}) {
  const params = animalFilterParams(filters)
  const base = `/admin/${kind}`
  const hasFilters = Boolean(filters.q || filters.status !== "전체" || filters.size !== "전체" || filters.gender !== "전체" || filters.neutered !== "전체")
  const detailCount = [filters.size, filters.gender, filters.neutered].filter(v => v !== "전체").length
  const options = (values: readonly string[]) => ["전체", ...values].map(value => ({ value, label: value }))
  return <div className="mx-auto w-full max-w-6xl px-4 py-7 md:px-6 md:py-9">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><p className="mb-2 text-xs text-muted-foreground">아이들 관리</p><h1 className="text-2xl font-bold tracking-tight">아이들 목록</h1><p className="mt-2 text-sm text-muted-foreground">아이의 정보와 보호 상태를 관리합니다.</p></div>
      <Link href={`${base}/new`} className={cn(buttonVariants(), "min-h-11")}>새 아이 등록</Link>
    </header>
    <nav aria-label="아이 종류" className="mb-6 flex gap-7 border-b border-border">
      {(["dogs", "cats"] as const).map(value => <Link key={value} href={`/admin/${value}`} aria-current={kind === value ? "page" : undefined} className={cn("inline-flex min-h-11 items-center border-b-2 px-1 pb-3 text-sm transition-colors hover:text-foreground", kind === value ? "border-primary font-semibold text-foreground" : "border-transparent text-muted-foreground")}>{value === "dogs" ? "강아지" : "고양이"}</Link>)}
    </nav>
    <div className="mb-4"><SearchBox placeholder="이름, 품종으로 찾기" className="max-w-xl [&_input]:min-h-11" /></div>
    <details key={detailCount ? "filtered" : "default"} open={detailCount > 0} className="mb-4 rounded-xl border border-border bg-card px-4">
      <summary className="cursor-pointer py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">상세 필터{detailCount > 0 && <span className="ml-2 text-primary">{detailCount}개 적용</span>}</summary>
      <div className="flex flex-wrap gap-4 border-t border-border py-4">
        {kind === "dogs" && <AnimalQuerySelect label="크기" name="size" value={filters.size} options={options(ANIMAL_SIZES)} />}
        <AnimalQuerySelect label="성별" name="gender" value={filters.gender} options={options(ANIMAL_GENDERS)} />
        <AnimalQuerySelect label="중성화" name="neutered" value={filters.neutered} options={[{ value: "전체", label: "전체" }, { value: "true", label: "완료" }, { value: "false", label: "미완료" }]} />
        <Link href={animalListHref(kind, { ...params, size: undefined, gender: undefined, neutered: undefined })} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">상세 조건 초기화</Link>
      </div>
    </details>
    <nav aria-label="보호 상태 필터" className="mb-6 flex flex-wrap gap-1.5">
      {["전체", ...ANIMAL_STATUSES].map(status => <Link key={status} href={animalListHref(kind, { ...params, status: status === "전체" ? undefined : status })} aria-current={status === filters.status ? "true" : undefined} className={cn("inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-medium transition-colors", status === filters.status ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{status}</Link>)}
    </nav>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm text-muted-foreground">{hasFilters ? "검색 결과" : "전체"} <strong className="font-semibold text-foreground">{total.toLocaleString()}</strong>마리{animals.length > 0 && <span className="ml-2 text-xs">· {(filters.page - 1) * filters.pageSize + 1}–{(filters.page - 1) * filters.pageSize + animals.length} 표시</span>}</p>
      <div className="flex flex-wrap gap-3"><AnimalQuerySelect label="정렬" name="sort" value={filters.sort} options={[{ value: "latest", label: "최근 수정순" }, { value: "name", label: "이름순" }, ...(kind === "dogs" ? [{ value: "pinned", label: "고정순" }] : [])]} /><AnimalQuerySelect label="표시" name="pageSize" value={String(filters.pageSize)} options={[20, 50, 100].map(n => ({ value: String(n), label: `${n}개` }))} /></div>
    </div>
    <div className="rounded-xl border border-border bg-card">
      <div aria-hidden className="hidden grid-cols-[minmax(0,1.6fr)_120px_minmax(80px,0.7fr)_220px] gap-4 rounded-t-xl bg-muted/50 px-5 py-3 text-xs text-muted-foreground xl:grid"><span>아이 정보</span><span className="text-center">보호 상태</span><span className="text-center">보호 위치</span><span className="text-center">관리</span></div>
      <ul className="divide-y divide-border">
        {animals.map(animal => {
          const image = animal.images[animal.thumbnail_index] ?? animal.images[0]
          const edit = `${base}/${animal.id}/edit`
          return <li key={animal.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 p-4 transition-colors hover:bg-primary/[0.035] motion-reduce:transition-none xl:grid-cols-[minmax(0,1.6fr)_120px_minmax(80px,0.7fr)_220px] xl:gap-4 xl:px-5 xl:py-5">
            <Link href={edit} className="row-span-2 flex min-w-0 items-center gap-3 rounded-lg hover:text-primary focus-visible:outline-2 focus-visible:outline-ring xl:row-span-1">
              <div className="relative flex size-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-muted-foreground sm:size-[72px]">
                {image ? <Image src={image} alt={animal.name} fill sizes="72px" className="object-cover" /> : <><ImageIcon className="size-5" aria-hidden /><span className="mt-1 text-[10px]">사진 없음</span></>}
              </div>
              <div className="min-w-0"><h2 className="break-words text-sm font-semibold [overflow-wrap:anywhere] sm:text-base">{animal.name}</h2><p className="mt-1 break-words text-xs text-muted-foreground">{animal.breed || "품종 미상"}</p><p className="mt-0.5 text-xs text-muted-foreground">{animal.gender}{"size" in animal && animal.size ? ` · ${animal.size}` : ""}{animal.neutered === true ? " · 중성화 완료" : ""}</p>{"is_pinned" in animal && animal.is_pinned && <p className="mt-1 text-[11px] text-primary">홈 고정 설정</p>}</div>
            </Link>
            <div className="xl:flex xl:justify-center"><AnimalStatusSelect kind={kind} id={animal.id} name={animal.name} status={animal.status} /></div>
            <p className="max-w-32 break-words text-right text-xs text-muted-foreground xl:max-w-none xl:text-center"><span className="sr-only">보호 위치: </span>{animal.kennel_location || "위치 미입력"}</p>
            <div className="col-span-2 flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-3 xl:col-span-1 xl:justify-center xl:border-0 xl:pt-0">
              <Link href={edit} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-muted">정보 수정</Link>
              {image ? <QuickAnimalPhoto kind={kind} id={animal.id} name={animal.name} images={animal.images} index={animal.thumbnail_index} compact /> : <Link href={edit} className="inline-flex min-h-11 items-center px-3 text-xs text-muted-foreground hover:text-foreground">사진 등록</Link>}
              {canDelete && <AnimalRowMenu kind={kind} id={animal.id} name={animal.name} />}
            </div>
          </li>
        })}
      </ul>
      {!animals.length && <div className="px-5 py-12 text-center"><p className="font-medium">{total > 0 ? "이 페이지에는 아이가 없습니다." : hasFilters ? "조건에 맞는 아이가 없습니다." : "아직 등록된 아이가 없습니다."}</p><p className="mt-2 text-sm text-muted-foreground">{hasFilters ? "검색어나 필터를 변경해 주세요." : "새 아이 등록에서 정보를 입력해 주세요."}</p><Link href={base} className="mt-4 inline-flex min-h-11 items-center text-sm text-primary underline">전체 목록 보기</Link></div>}
    </div>
    <Pagination currentPage={filters.page} totalPages={Math.max(1, Math.ceil(total / filters.pageSize))} basePath={base} searchParams={params} />
  </div>
}
