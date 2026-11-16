// raw2026/*.txt (대학어디가에서 옮겨 적은 2026학년도 정시 결과) → data.js 생성
// 실행: node build-data.js
//
// raw2026 파일 한 줄 형식: 군|모집단위|국|수|탐1|탐2|영어등급|평균백분위(대학 공시)|탐구유형
//   - 국·수·탐1·탐2: 정시 일반전형 최종등록자 70% 학생의 과목별 백분위
//   - 탐2가 '-'면 탐구 1과목 반영 모집단위
//   - 탐구유형: 70% 학생의 탐구 과목 (사=사회탐구, 과=과학탐구)
// raw2025/ 폴더는 이전(2025학년도) 자료 보관용이며 빌드에 쓰지 않습니다.
const fs = require("fs");
const path = require("path");

const YEAR = 2026;
const RAW_DIR = path.join(__dirname, `raw${YEAR}`);

const UNIVS = {
  서울대: { region: "서울", code: "0000019" },
  연세대: { region: "서울", code: "0000149" },
  고려대: { region: "서울", code: "0000069" },
  서강대: { region: "서울", code: "0000120" },
  성균관대: { region: "서울", code: "0000133" },
  한양대: { region: "서울", code: "0000203" },
  중앙대: { region: "서울", code: "0000175" },
  경희대: { region: "서울", code: "0000066" },
  한국외대: { region: "서울", code: "0000192" },
  한국외대글로벌: { name: "한국외대(글로벌)", region: "경기", code: "0000192" },
  서울시립대: { region: "서울", code: "0000040" },
  건국대: { region: "서울", code: "0000052" },
  동국대: { region: "서울", code: "0000100" },
  홍익대: { region: "서울", code: "0000212" },
  숙명여대: { region: "서울", code: "0000141" },
  국민대: { region: "서울", code: "0000078" },
};

// 실기 비중이 커서 수능 백분위만으로 판단하기 어려운 모집단위는 제외
const EXCLUDE = /디자인|공예|예술|공연|연극|영화|사진|미술|판화|섬유|회화|조소|조형|도예|체육|스포츠|골프/;

const SCI = /공학|과학|수학|물리|화학|생명|생물|의예|의학|의과|치의|한의예\(자연|약학|약과|간호|컴퓨터|소프트웨어|데이터|인공지능|AI|반도체|건축|기계|전기|전자|신소재|소재|바이오|보건|식품|환경|통계|에너지|통신|모빌리티|보안|자연|수의|건설|토목|도시공|교통|조경|원예|천문|대기|지구|IT|ICT|나노|발효|산업공|산업시스템|정보시스템|첨단|양자|원자|광역/;
const HUM = /\(인문|인문|어문|문학|언어|국어|영어|사학|역사|철학|경영|경제|행정|정치|사회|미디어|교육학|법|무역|통상|외교|심리|광고|홍보|관광|한국학|중국|일본|문헌|아동|가족|소비자|세무|회계|어과|어학|국제|윤리|신학|불교|문화|언론/;

// 학과 이름으로 계열 추정 → 애매하면 70% 합격자의 탐구 과목(사탐/과탐)으로 보조 판단
function guessTrack(dept, types) {
  if (/\(자연|자연\)|자연계열/.test(dept)) return "자연";
  if (/\(인문|인문\)|인문계열|\(상경\)/.test(dept)) return "인문";
  const name = dept.replace(/전공/g, ""); // '자유전공학부'가 '공학'으로 잡히지 않게
  const s = SCI.test(name), h = HUM.test(name);
  if (s && !h) return "자연";
  if (h && !s) return "인문";
  if (types === "과과" || types === "과") return "자연";
  if (types === "사사" || types === "사") return "인문";
  return "공통";
}

const round2 = (n) => Math.round(n * 100) / 100;
const departments = [];

for (const [file, meta] of Object.entries(UNIVS)) {
  const text = fs.readFileSync(path.join(RAW_DIR, `${file}.txt`), "utf8");
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const [gun, dept, ko, ma, t1, t2, eng, , types] = line.split("|");
    if (EXCLUDE.test(dept) || seen.has(dept)) continue;
    seen.add(dept);
    const [k, m, a] = [ko, ma, t1].map(Number);
    const b = t2 === "-" ? a : Number(t2); // 탐구 1과목 반영이면 그 과목만
    const inquiry = round2((a + b) / 2);
    departments.push({
      univ: meta.name || file,
      region: meta.region,
      gun: gun || null,
      dept,
      track: guessTrack(dept, types),
      cut: round2((k + m + inquiry) / 3), // 국·수·탐(2과목 평균) 백분위 평균
      subjects: { korean: k, math: m, inquiry },
      english: eng === "-" ? null : Math.round(Number(eng)),
      code: meta.code,
    });
  }
}

const out = `// 자동 생성 파일 — 직접 고치지 말고 raw${YEAR}/*.txt를 고친 뒤 \`node build-data.js\`를 실행하세요.
// 출처: 대학어디가(adiga.kr) 대학별 '평가기준 및 입시결과' > 수능위주전형 > ${YEAR}학년도 전형 결과
// 기준: 정시 일반전형, 최종등록자 70% 학생의 과목별 백분위
const DATA_INFO = ${JSON.stringify({ year: YEAR, source: "대학어디가(adiga.kr)", searchSyr: YEAR + 1, undisclosed: [] }, null, 2)};

const DEPARTMENTS = ${JSON.stringify(departments)};
`;
fs.writeFileSync(path.join(__dirname, "data.js"), out);
console.log(`${Object.keys(UNIVS).length}개 대학(캠퍼스) ${departments.length}개 모집단위 → data.js`);
const byTrack = departments.reduce((a, d) => ((a[d.track] = (a[d.track] || 0) + 1), a), {});
console.log(byTrack);
