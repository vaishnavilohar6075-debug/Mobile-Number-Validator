#!/usr/bin/env python3
"""
Verification harness for the DFA transition-matrix update.
Loads the real index.html in headless Chromium (Playwright) and checks it.

Usage:  python3 verify_dfa.py /path/to/repo  [/path/to/original/repo-for-regression]
"""
import sys, json, random, time
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO = Path(sys.argv[1]).resolve()
ORIG = Path(sys.argv[2]).resolve() if len(sys.argv) > 2 else None
URL = (REPO / "index.html").as_uri()

results = []
def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f"   [{detail}]" if (detail and not cond) else ""))

# ---------------------------------------------------------------------------
# Independent expectations, derived from the rules (NOT read from the code under test)
# ---------------------------------------------------------------------------
Q = lambda n: "qd" if n == "d" else f"q{n}"
def expected_matrices():
    m = {}
    # Name: cols Letter, Space, Other
    m[0] = dict(start=0, acc=[1], rows={0: ["q1","qd","qd"], 1: ["q1","q2","qd"], 2: ["q1","qd","qd"]})
    # Mobile: cols Digit 6-9, Digit 0-5, Other
    r = {3: ["q4","qd","qd"]}
    for k in range(4, 13): r[k] = [f"q{k+1}", f"q{k+1}", "qd"]
    r[13] = ["qd","qd","qd"]
    m[1] = dict(start=3, acc=[13], rows=r)
    # Email: cols Letter, Digit, Hyphen, Underscore, Dot, At, Other
    m[2] = dict(start=14, acc=[22], rows={
        14: ["q15","q15","q15","q15","qd","qd","qd"],
        15: ["q15","q15","q15","q15","q16","q17","qd"],
        16: ["q15","q15","q15","q15","qd","qd","qd"],
        17: ["q18","q18","qd","qd","qd","qd","qd"],
        18: ["q18","q18","q19","qd","q20","qd","qd"],
        19: ["q18","q18","q19","qd","qd","qd","qd"],
        20: ["q21","q18","qd","qd","qd","qd","qd"],
        21: ["q22","q18","q19","qd","qd","qd","qd"],
        22: ["q22","q18","q19","qd","q20","qd","qd"],
    })
    # PIN: cols Digit 1-9, Digit 0, Other
    r = {23: ["q24","qd","qd"]}
    for k in range(24, 29): r[k] = [f"q{k+1}", f"q{k+1}", "qd"]
    r[29] = ["qd","qd","qd"]
    m[3] = dict(start=23, acc=[29], rows=r)
    # DOB: cols Digit 0-9, Slash, Other   (DD / MM / YYYY)
    seq = {30:("digit",31), 31:("digit",32), 32:("slash",33), 33:("digit",34), 34:("digit",35),
           35:("slash",36), 36:("digit",37), 37:("digit",38), 38:("digit",39), 39:("digit",40)}
    r = {}
    for k in range(30, 41):
        if k in seq:
            kind, nx = seq[k]
            r[k] = [f"q{nx}","qd","qd"] if kind == "digit" else ["qd", f"q{nx}", "qd"]
        else:
            r[k] = ["qd","qd","qd"]
    m[4] = dict(start=30, acc=[40], rows=r)
    for g in m: m[g]["rows"]["d"] = ["qd"] * len(next(iter(m[g]["rows"].values())))
    return m

# Spec-level reference languages for each lane
JS_REFS = r"""
const REF = {
 0: v => /^[A-Za-z]+( [A-Za-z]+)*$/.test(v),
 1: v => /^[6-9][0-9]{9}$/.test(v),
 2: v => {            // natural reading of "local@domain.tld" with the project's character rules
   const m=v.split('@'); if(m.length!==2) return false; const [loc,dom]=m;
   if(!/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/.test(loc)) return false;
   const labels=dom.split('.'); if(labels.length<2) return false;
   const lab=/^[A-Za-z0-9]+(-+[A-Za-z0-9]+)*$/;
   if(!/^[A-Za-z]{2,}$/.test(labels.at(-1))) return false;
   return labels.slice(0,-1).every(l=>lab.test(l));
 },
 3: v => /^[1-9][0-9]{5}$/.test(v),
 4: v => /^[0-9]{2}\/[0-9]{2}\/[0-9]{4}$/.test(v)
};
"""

def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 1200, "height": 900}, color_scheme="dark")
        pg = ctx.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
        pg.on("console", lambda m: errors.append("console.error: " + m.text) if m.type == "error" and "fonts.g" not in m.text and "ERR_" not in m.text else None)
        pg.goto(URL)

        # ---------------- 1. Tables as displayed == independent expectation ----------------
        shown = pg.evaluate("""()=>[0,1,2,3,4].map(g=>{
            const card=document.getElementById('mx'+g);
            const rows={};
            card.querySelectorAll('tbody tr').forEach(tr=>{
              rows[tr.dataset.r]=[...tr.querySelectorAll('td')].map(td=>td.textContent.trim());
            });
            const heads=[...card.querySelectorAll('thead th')].map(t=>t.firstChild.textContent.trim());
            const marks={};
            card.querySelectorAll('tbody th').forEach(th=>marks[th.parentElement.dataset.r]=th.querySelector('.mk').textContent);
            return {heads,rows,marks,title:card.querySelector('.mx-title').textContent,
                    summary:card.querySelector('summary').textContent};
        })""")
        exp = expected_matrices()
        names = ["Name", "Mobile Number", "Email", "PIN Code", "Date of Birth"]
        for g in range(5):
            s, e = shown[g], exp[g]
            e_rows = {str(k): v for k, v in e["rows"].items()}
            check(f"{names[g]} DFA: displayed matrix equals independent expected matrix", s["rows"] == e_rows,
                  json.dumps({k: (s['rows'].get(k), e_rows.get(k)) for k in e_rows if s['rows'].get(k) != e_rows.get(k)}))
            marks_ok = all(
                s["marks"][str(r)] == (("→" if r == e["start"] else "") + ("*" if r in e["acc"] else ""))
                for r in e["rows"] if r != "d") and s["marks"]["d"] == ""
            check(f"{names[g]} DFA: → on initial q{e['start']} and * on accepting {e['acc']} only", marks_ok, json.dumps(s["marks"]))
            check(f"{names[g]} DFA: heading and 'View Transition Matrix' toggle present",
                  "TRANSITION MATRIX" in s["title"].upper() and "Δ(Q, Σ)" in s["title"] and s["summary"] == "View Transition Matrix")
        pl = pg.evaluate("document.body.innerText").lower()
        mx_text = pg.evaluate("document.getElementById('mxs').innerText")
        import re as _re
        check("No placeholder text on page; no undefined/NaN/null/[object] leaking into the matrix section",
              not any(w in pl for w in ["placeholder", "todo", "tbd", "lorem"]) and not _re.search(r"undefined|nan|null|\[object", mx_text.lower()))

        # ---------------- 2. Matrices == diagram edge list (E) ----------------
        r = pg.evaluate("""()=>{
          const out={};
          for(const ln of LANES){
            const lane=new Set(st.map((s,k)=>s.g===ln.g?k:-1).filter(k=>k>=0));
            // transitions implied by the displayed table (excluding qd)
            const fromTable=new Set();
            document.querySelectorAll('#mx'+ln.g+' td').forEach(td=>{
              const t=td.textContent.trim(); if(t!=='qd') fromTable.add(td.dataset.r+'>'+t.slice(1));
            });
            // transitions drawn in the diagram / simulation (lane-internal, not the '|' hand-off)
            const fromE=new Set(E.filter(e=>lane.has(e[0])&&e[2]!=='|').map(e=>e[0]+'>'+e[1]));
            out[ln.g]={t:[...fromTable].sort(),e:[...fromE].sort()};
          }
          out.svg={paths:document.querySelectorAll('#svg path[id^=e]').length,nodes:document.querySelectorAll('#svg rect.nd[id^=s]').length,
                   E:E.length,st:st.length,hasDead:!!document.getElementById('sd')};
          return out;}""")
        for g in range(5):
            check(f"{names[g]} DFA: every table transition is an edge in E (diagram) and vice-versa", r[str(g)]["t"] == r[str(g)]["e"],
                  f"table-only={set(r[str(g)]['t'])-set(r[str(g)]['e'])} E-only={set(r[str(g)]['e'])-set(r[str(g)]['t'])}")
        sv = r["svg"]
        check("Diagram draws every edge of E and every state (+qd)", sv["paths"] == sv["E"] == 54 and sv["nodes"] == sv["st"] + 1 == 42 and sv["hasDead"], str(sv))

        # ---------------- 3. Column categories are true partitions of the alphabet ----------------
        r = pg.evaluate("""()=>{
          const chars=[]; for(let c=0;c<=126;c++) chars.push(String.fromCharCode(c));
          chars.push('é','٣','中','\\u00a0','\\u200b','ß','ı');
          const bad=[], handoffs=[];
          for(const ln of LANES){
            const ids=st.map((s,k)=>s.g===ln.g?k:-1).filter(k=>k>=0);
            for(const s of ids) for(const ch of chars){
              const real=stepDFA(s,ch).next;
              const ci=catIndex(ln,ch);
              const shownCell=document.querySelector('#mx'+ln.g+' td[data-r="'+s+'"][data-c="'+ci+'"]').textContent.trim();
              const realTxt=q(real);
              if(realTxt!==shownCell){
                if(ch==='|'&&real!=='d') handoffs.push(q(s)+'->'+realTxt); else bad.push(q(s)+' '+JSON.stringify(ch)+' real='+realTxt+' table='+shownCell);
              }
            }
            // every symbol routes to qd from qd
            for(const ch of chars) if(stepDFA('d',ch).next!=='d') bad.push('qd leaks on '+ch);
          }
          return {bad,handoffs,n:chars.length};}""")
        check(f"Table cell == stepDFA() for all {r['n']} test characters x every state (only '|' hand-offs differ)", not r["bad"], str(r["bad"][:5]))
        check("Only the 4 documented '|' exits differ from the standalone matrices", sorted(r["handoffs"]) == sorted(["q1->q3", "q13->q14", "q22->q23", "q29->q30"]), str(r["handoffs"]))

        # ---------------- 4. Language equivalence: matrix DFA == runDFA == reference ----------------
        r = pg.evaluate(JS_REFS + """
        (()=>{
          const rnd=(()=>{let s=12345;return()=>(s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff;})();
          const pick=a=>a[Math.floor(rnd()*a.length)];
          const alpha={
            0:'aZ  .1-é|', 1:'0123456789ab +', 2:'abZ09._-@@@ #', 3:'0123456789a-', 4:'0123456789////a'};
          const starts={0:0,1:3,2:14,3:23,4:30};
          const mat=g=>{ // read the DISPLAYED table into a function
            const ln=LANES[g]; const T={};
            document.querySelectorAll('#mx'+g+' td').forEach(td=>T[td.dataset.r+'|'+td.dataset.c]=td.textContent.trim());
            return v=>{let s=String(starts[g]); for(const ch of v){const t=T[s+'|'+catIndex(ln,ch)]; s=t.slice(1); if(t==='qd'){s='d';}}
                       return s!=='d'&&ln.acc.includes(+s);};
          };
          // seed with guaranteed-valid strings so the accepting side is well covered
          const seeds={0:['Aditi Sharma','A','Ab Cd Ef','aB'],1:['9876543210','6000000000','7123456789'],
            2:['a@b.com','a.b@c.co','x_y-z@d-e.fgh','user@mail.co.in','a@b2.com','a@b-c.com','a@b.1x.com','a@1.com'],
            3:['415001','110001','999999'],4:['15/08/2003','00/00/0000','99/99/9999','32/13/7663']};
          const out={};
          for(let g=0;g<5;g++){
            const M=mat(g); let n=0,bad=[],acc=0; const diverge=[];
            const test=v=>{
              n++; const a=M(v); const b=(()=>{const f=runDFA(v,starts[g]).finalState;return f!=='d'&&LANES[g].acc.includes(f);})();
              const c=REF[g](v); if(a) acc++;
              if(a!==b) bad.push('matrix!=runDFA '+JSON.stringify(v));
              if(a!==c) diverge.push(v);
            };
            seeds[g].forEach(test);
            for(let i=0;i<40000;i++){const L=Math.floor(rnd()*16);let v='';for(let j=0;j<L;j++)v+=pick([...alpha[g]]);test(v);}
            // mutate seeds
            for(const sd of seeds[g]) for(let i=0;i<=sd.length;i++){test(sd.slice(0,i));test(sd.slice(0,i)+'#'+sd.slice(i));test(sd.slice(0,i)+sd.slice(i+1));test(sd+sd[i%sd.length]);}
            out[g]={n,acc,bad:bad.slice(0,3),nbad:bad.length,diverge:diverge.slice(0,5),ndiv:diverge.length};
          }
          return out;})()""")
        for g in range(5):
            o = r[str(g)]
            check(f"{names[g]} DFA: matrix == runDFA on {o['n']} strings ({o['acc']} accepted)", o["nbad"] == 0 and o["acc"] > 0, str(o["bad"]))
            if g != 2:
                check(f"{names[g]} DFA: matrix == independent reference language", o["ndiv"] == 0, str(o["diverge"]))
        o = r["2"]
        # Email: characterise the one known deviation from a natural domain grammar
        single_mid = [v for v in o["diverge"]]
        check("Email DFA: only deviation from natural grammar is a 1-letter middle domain label (e.g. a@x.y.com)",
              all(any(len(l) == 1 and l.isalpha() for l in v.split("@")[1].split(".")[1:-1]) for v in single_mid),
              str(single_mid))

        # ---------------- 5. Field-level validation through the real evaluateField ----------------
        cases = [
            (0, "Aditi Sharma", True), (0, "Aditi", True), (0, "A B C", True), (0, "", False), (0, " Aditi", False), (0, "Aditi ", False),
            (0, "Aditi  Sharma", False), (0, "Adit1", False), (0, "Aditi#", False), (0, "Aditi|", False),
            (1, "9876543210", True), (1, "6000000000", True), (1, "5876543210", False), (1, "987654321", False), (1, "98765432101", False),
            (1, "98765a3210", False), (1, "", False),
            (2, "aditi@gmail.com", True), (2, "a.b@c.co", True), (2, "aditi@gmail", False), (2, "aditi@@gmail.com", False), (2, ".a@b.com", False),
            (2, "a..b@c.com", False), (2, "a@b.c", False), (2, "a@-b.com", False), (2, "a@b-.com", False), (2, "a_b@c.com", True), (2, "a@b_c.com", False),
            (3, "415001", True), (3, "015001", False), (3, "41500", False), (3, "4150011", False), (3, "41500a", False),
            (4, "15/08/2003", True), (4, "29/02/2000", True), (4, "29/02/1900", False), (4, "29/02/2023", False), (4, "31/04/2001", False),
            (4, "32/13/7663", False), (4, "15-08-2003", False), (4, "1/8/2003", False), (4, "15/08/2099", False), (4, "01/01/2100", False),
            (4, "31/12/1899", False), (4, "00/10/2000", False), (4, "10/00/2000", False),
        ]
        got = pg.evaluate("(c)=>c.map(([g,v])=>evaluateField(g,v).ok)", [[g, v] for g, v, _ in cases])
        wrong = [(c[0], c[1], c[2], gv) for c, gv in zip(cases, got) if c[2] != gv]
        check(f"evaluateField gives expected verdict on {len(cases)} valid/invalid inputs", not wrong, str(wrong))

        # ---------------- 6. Calendar validation: exhaustive vs. Date round-trip oracle ----------------
        r = pg.evaluate("""()=>{
          const today=new Date(2026,9,10);           // fixed 10 Oct 2026 for determinism
          const p2=n=>String(n).padStart(2,'0'); let n=0,bad=[];
          for(let y=1890;y<=2105;y++)for(let m=0;m<=13;m++)for(let d=0;d<=32;d++){
            const s=p2(d)+'/'+p2(m)+'/'+String(y).padStart(4,'0');
            const dt=new Date(y,m-1,d);
            const exists=m>=1&&m<=12&&d>=1&&dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;
            const want= exists && y>=1900 && y<=2099 && dt<=today;
            const got=cal(s,today)===null; n++;
            if(want!==got&&bad.length<5)bad.push(s+' want='+want+' got='+got+' ('+cal(s,today)+')');
          }
          return {n,bad};}""")
        check(f"cal(): {r['n']} dd/mm/yyyy combos (y 1890-2105, incl. out-of-range d/m) match existence+range+future oracle", not r["bad"], str(r["bad"]))
        spot = pg.evaluate("""()=>{const t=new Date(2026,9,10),c=s=>cal(s,t);return {
          leap400:c('29/02/2000'),notLeap100:c('29/02/1900'),leap4:c('29/02/2004'),notLeap:c('29/02/2023'),
          imp:c('32/13/7663'),today:c('10/10/2026'),tomorrow:c('11/10/2026'),future:c('01/01/2099'),min:c('01/01/1900'),belowMin:c('31/12/1899'),above:c('01/01/2100')}}""")
        check("Leap years: 2000 ok (÷400), 1900 rejected (÷100 not ÷400), 2004 ok (÷4), 2023 rejected",
              spot["leap400"] is None and spot["notLeap100"] and spot["leap4"] is None and spot["notLeap"])
        check("32/13/7663 rejected", bool(spot["imp"]), str(spot["imp"]))
        check("Today accepted; tomorrow and 2099 rejected as future", spot["today"] is None and "future" in (spot["tomorrow"] or "") and "future" in (spot["future"] or ""))
        check("Year bounds 1900..2099 enforced", spot["min"] is None and bool(spot["belowMin"]) and bool(spot["above"]))

        # ---------------- 7. Combined simulation: records, Step / Run / Pause / Reset ----------------
        def fill(vals):
            for id_, v in zip(["inp-name","inp-mobile","inp-email","inp-pin","inp-dob"], vals):
                pg.fill("#" + id_, v)
        def final_verdict(vals):
            fill(vals); pg.click("#run")
            pg.wait_for_function("S.simState==='DONE'", timeout=40000)
            return pg.inner_text("#pill")
        pg.fill("#spd", "10")
        pg.evaluate("document.getElementById('spd').value=10;document.getElementById('spd').dispatchEvent(new Event('input'))")
        good = ["Aditi Sharma", "9876543210", "aditi@gmail.com", "415001", "15/08/2003"]
        check("Combined: valid record ACCEPTED", final_verdict(good) == "ACCEPTED")
        check("Combined: 32/13/7663 REJECTED (pattern ok, calendar impossible)", final_verdict(good[:4] + ["32/13/7663"]) == "REJECTED")
        check("Combined: 29/02/2023 REJECTED", final_verdict(good[:4] + ["29/02/2023"]) == "REJECTED")
        check("Combined: future DOB 15/08/2099 REJECTED", final_verdict(good[:4] + ["15/08/2099"]) == "REJECTED")
        why = pg.inner_text("#why")
        check("Combined: rejection reason mentions future date", "future" in why.lower(), why)
        check("Combined: bad mobile (leading 5) REJECTED", final_verdict([good[0], "5876543210"] + good[2:]) == "REJECTED")
        check("Combined: bad PIN REJECTED", final_verdict(good[:3] + ["015001", good[4]]) == "REJECTED")

        # Step through the valid record, comparing the highlighted cell to an independent expectation
        fill(good)
        pg.click("#rst"); fill(good)
        rec = "|".join(good)
        ok_all = True; first_bad = None
        for i in range(1, len(rec) + 1):
            pg.click("#step")
            info = pg.evaluate("""()=>({
               i:S.i, sim:S.simState,
               hot:[...document.querySelectorAll('#mx-list td.hot')].map(t=>t.closest('article').id+':'+t.dataset.r+':'+t.dataset.c+'>'+t.textContent.trim()),
               cur:[...document.querySelectorAll('#mx-list tr.cur')].map(t=>t.closest('article').id+':'+t.dataset.r),
               cap:[...document.querySelectorAll('.mx-last')].map(e=>e.textContent).filter(Boolean)})""")
            exp_ = pg.evaluate("""(i)=>{
               const rec=getVals().join('|'),{path}=runDFA(rec,0);
               const prev=path[i-1],ch=rec[i-1],next=path[i],cur=path[i];
               const g=st[cur==='d'?path.slice(0,i+1).filter(x=>x!=='d').at(-1):cur].g;
               const handoff=ch==='|'&&prev!=='d'&&next!=='d';
               const gl=st[prev==='d'?path.slice(0,i).filter(x=>x!=='d').at(-1):prev].g;
               return {cur:'mx'+g+':'+cur, hot: handoff?null:('mx'+gl+':'+prev+':'+catIndex(LANES[gl],ch)+'>'+q(next))};}""", i)
            good_step = info["cur"] == [exp_["cur"]] and ((not info["hot"] and exp_["hot"] is None) or info["hot"] == [exp_["hot"]])
            if not good_step and ok_all:
                ok_all = False; first_bad = (i, info, exp_)
        check("Step: current row + last-transition cell highlighted correctly at every one of %d steps" % len(rec), ok_all, str(first_bad))
        check("Step: ends in DONE/ACCEPTED", pg.inner_text("#pill") == "ACCEPTED")

        # dead-state highlighting
        pg.click("#rst"); fill([good[0], "5876543210"] + good[2:])
        for _ in range(len(good[0]) + 2): pg.click("#step")
        d = pg.evaluate("""()=>({hot:[...document.querySelectorAll('#mx-list td.hot')].map(t=>t.className+' '+t.textContent.trim()),
            dead:[...document.querySelectorAll('#mx-list tr.cur')].map(t=>t.closest('article').id+':'+t.dataset.r),
            badon:[...document.querySelectorAll('#mx-list .badon')].map(e=>e.id)})""")
        check("Dead state: transition into qd highlighted red in the Mobile matrix and qd row marked current",
              d["dead"] == ["mx1:d"] and d["badon"] == ["mx1"] and len(d["hot"]) == 1 and "bad" in d["hot"][0] and d["hot"][0].endswith("qd"), str(d))

        # Pause / Run / Reset
        pg.click("#rst"); fill(good)
        pg.evaluate("document.getElementById('spd').value=4;document.getElementById('spd').dispatchEvent(new Event('input'))")
        pg.click("#run"); pg.wait_for_function("S.i>=4", timeout=10000); pg.click("#pause")
        snap1 = pg.evaluate("({i:S.i,sim:S.simState,hot:[...document.querySelectorAll('#mx-list td.hot')].map(t=>t.dataset.r+t.dataset.c),cur:[...document.querySelectorAll('#mx-list tr.cur')].map(t=>t.dataset.r)})")
        time.sleep(1.5)
        snap2 = pg.evaluate("({i:S.i,sim:S.simState,hot:[...document.querySelectorAll('#mx-list td.hot')].map(t=>t.dataset.r+t.dataset.c),cur:[...document.querySelectorAll('#mx-list tr.cur')].map(t=>t.dataset.r)})")
        check("Pause: simulation stops and highlight is preserved", snap1 == snap2 and snap1["sim"] == "PAUSED" and len(snap1["hot"]) == 1, f"{snap1} vs {snap2}")
        pg.click("#run"); time.sleep(0.9)
        check("Run after Pause: resumes from the paused position", pg.evaluate("S.i") > snap1["i"])
        pg.click("#pause")
        pg.click("#rst")
        r = pg.evaluate("({sim:S.simState,i:S.i,hot:document.querySelectorAll('#mx-list .hot,#mx-list .cur,#mx-list .on').length,inputs:getVals().join(''),cap:[...document.querySelectorAll('.mx-last')].map(e=>e.textContent).join('')})")
        check("Reset: highlights cleared, inputs emptied, back to IDLE / initial state", r == {"sim": "IDLE", "i": 0, "hot": 0, "inputs": "", "cap": ""}, str(r))

        # collapsed section must not break the simulation
        pg.evaluate("document.querySelectorAll('.mx details').forEach(d=>d.open=false)")
        fill(good); pg.click("#rst"); fill(good)
        for _ in range(12): pg.click("#step")
        check("Collapsed matrices: stepping works with no errors", pg.evaluate("S.i") == 12)
        pg.evaluate("document.querySelectorAll('.mx details').forEach(d=>d.open=true)")

        check("No JavaScript errors / console errors during all of the above", not errors, str(errors[:3]))

        # ---------------- 8. Layout: desktop dark/light and phone widths ----------------
        pg.click("#rst"); fill(good)
        for _ in range(20): pg.click("#step")
        pg.screenshot(path="/home/claude/shot_desktop_dark.png", full_page=True)
        el = pg.query_selector("#mxs"); el.screenshot(path="/home/claude/shot_matrices_dark.png")
        for w in (375, 320):
            pg2 = b.new_context(viewport={"width": w, "height": 800}, color_scheme="dark").new_page()
            pg2.goto(URL)
            m = pg2.evaluate("""()=>{const sc=[...document.querySelectorAll('.mx-scroll')];
                return {docW:document.documentElement.scrollWidth,vw:innerWidth,
                        scrolls:sc.map(s=>s.scrollWidth>s.clientWidth),
                        cardOverflow:[...document.querySelectorAll('.mx')].some(c=>c.scrollWidth>c.clientWidth+1)}}""")
            check(f"{w}px wide: page has no sideways scroll; wide matrices scroll inside their own container",
                  m["docW"] <= m["vw"] and not m["cardOverflow"] and m["scrolls"][2], str(m))
            if w == 375:
                pg2.evaluate("document.getElementById('mxs').scrollIntoView()")
                pg2.screenshot(path="/home/claude/shot_mobile_dark.png")
        pg3 = b.new_context(viewport={"width": 1200, "height": 900}, color_scheme="light").new_page()
        pg3.goto(URL); pg3.query_selector("#mxs").screenshot(path="/home/claude/shot_matrices_light.png")

        # ---------------- 9. Regression vs original script.js ----------------
        if ORIG:
            po = b.new_context().new_page(); po.goto((ORIG / "index.html").as_uri())
            probe = """()=>{
              const corpus=['Aditi Sharma','','A','a b','9876543210','5876543210','98765','aditi@gmail.com','a@x.y.com','a..b@c.com','415001','015001',
                '15/08/2003','29/02/2000','29/02/1900','32/13/7663','31/04/2001','15/08/2099','1/1/2000','Aditi Sharma|9876543210|aditi@gmail.com|415001|15/08/2003',
                'Aditi|9876543210|a@b.co|415001|01/01/2000','x|y'];
              return {E:E.map(e=>[e[0],e[1],e[2]]),st:st.map(s=>[s.g,s.i,s.dy]),ACC,
                ev:corpus.flatMap(v=>[0,1,2,3,4].map(g=>evaluateField(g,v))),
                runs:corpus.flatMap(v=>[0,3,14,23,30].map(s=>runDFA(v,s)))};}"""
            new, old = pg.evaluate(probe), po.evaluate(probe)
            diff_ev = [i for i, (a, c) in enumerate(zip(new["ev"], old["ev"])) if a != c]
            check("Regression: transition list E, state layout and accepting state unchanged", new["E"] == old["E"] and new["st"] == old["st"] and new["ACC"] == old["ACC"])
            check("Regression: runDFA paths identical to original on the corpus", new["runs"] == old["runs"])
            # only intended difference: 15/08/2099 (future) -> index of (corpus idx 17, g=4)
            exp_diff = [17 * 5 + 4]
            check("Regression: evaluateField identical to original except future DOB 15/08/2099", diff_ev == exp_diff, str(diff_ev))

        b.close()

    n_ok = sum(1 for _, ok, _ in results if ok)
    print(f"\n==== {n_ok}/{len(results)} checks passed ====")
    sys.exit(0 if n_ok == len(results) else 1)

main()
