import json

DATA_JSON = open('/home/claude/data_v9.json').read()

def filter_bar(sec, has_pos=True, has_school=True, has_stat=True):
    pos_row = """
    <div class="filter-row">
      <span class="filter-lbl">Position:</span>
      <button class="pill active" data-group="{s}pos" data-val="All">All</button>
      <button class="pill" data-group="{s}pos" data-val="G">Guard</button>
      <button class="pill" data-group="{s}pos" data-val="F">Forward</button>
      <button class="pill" data-group="{s}pos" data-val="C">Center</button>
    </div>""".format(s=sec) if has_pos else ""

    school_bit = """
      <div class="fdivider"></div>
      <span class="filter-lbl">School:</span>
      <select class="ssel" id="{s}-school"></select>""".format(s=sec) if has_school else ""

    stat_row = """
    <div class="filter-row">
      <span class="filter-lbl">Stats:</span>
      <button class="pill active" data-group="{s}stat" data-val="pg">Per Game</button>
      <button class="pill" data-group="{s}stat" data-val="p40">Per 40 Min</button>
    </div>""".format(s=sec) if has_stat else ""

    return """{pos}
    <div class="filter-row">
      <span class="filter-lbl">Conference:</span>
      <button class="pill active" data-group="{s}conf" data-val="All">All</button>
      <button class="pill" data-group="{s}conf" data-val="ACC">ACC</button>
      <button class="pill" data-group="{s}conf" data-val="Big 12">Big 12</button>
      <button class="pill" data-group="{s}conf" data-val="Big Ten">Big Ten</button>
      <button class="pill" data-group="{s}conf" data-val="Big East">Big East</button>
      <button class="pill" data-group="{s}conf" data-val="SEC">SEC</button>
      <button class="pill" data-group="{s}conf" data-val="Pac-12">Pac-12</button>{school}
    </div>{stat}""".format(pos=pos_row, s=sec, school=school_bit, stat=stat_row)


HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UCLA WBB — Transfer Intelligence Report</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
:root{--gold:#FFB300;--blue:#1B4B8A;--blue-dk:#0D2B52;--off:#F5F0E8;--warm:#C8C0B0;--green:#4CAF50;--red:#EF5350;--cyan:#7EC8E3;--purple:#E040FB;--surface:rgba(255,255,255,0.04);--border:rgba(255,179,0,0.2);}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--blue-dk);color:var(--off);font-family:'DM Sans',sans-serif;overflow-x:hidden;}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 60% at 20% 10%,rgba(27,75,138,.6) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 80% 80%,rgba(255,179,0,.08) 0%,transparent 50%),repeating-linear-gradient(45deg,transparent,transparent 60px,rgba(255,179,0,.015) 60px,rgba(255,179,0,.015) 61px);pointer-events:none;z-index:0;}
.wrap{max-width:1300px;margin:0 auto;padding:0 32px;position:relative;z-index:1;}
nav{position:sticky;top:0;z-index:100;background:rgba(13,43,82,.96);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);}
.nav-inner{display:flex;align-items:center;gap:4px;padding:0 32px;height:50px;max-width:1300px;margin:0 auto;}
.nb{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:var(--warm);background:none;border:none;cursor:pointer;padding:7px 14px;border-radius:5px;transition:.2s;white-space:nowrap;}
.nb:hover{color:var(--gold);background:rgba(255,179,0,.08);}
.nb.active{color:var(--gold);background:rgba(255,179,0,.12);border:1px solid rgba(255,179,0,.3);}
header{padding:52px 0 40px;border-bottom:1px solid var(--border);}
.hdr{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;}
.mark{width:68px;height:68px;background:var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:30px;color:var(--blue-dk);flex-shrink:0;box-shadow:0 0 40px rgba(255,179,0,.3);}
h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(28px,4vw,54px);line-height:.95;letter-spacing:2px;}
h1 span{color:var(--gold);}
.meta{text-align:right;font-family:'Space Mono',monospace;font-size:10px;color:var(--warm);line-height:1.8;}
.meta strong{color:var(--gold);display:block;font-size:12px;margin-bottom:3px;}
.sec{padding:56px 0 0;scroll-margin-top:58px;}
.sec-lbl{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:5px;}
.sec-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(22px,3vw,38px);letter-spacing:1.5px;margin-bottom:5px;line-height:1.05;}
.sec-sub{font-size:13px;color:var(--warm);font-weight:300;max-width:680px;line-height:1.65;margin-bottom:22px;}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:22px 26px;position:relative;overflow:hidden;}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--gold),transparent);}
.card-title{font-family:'Space Mono',monospace;font-size:10px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;margin-bottom:16px;}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:22px;}
.g2-asym{display:grid;grid-template-columns:3fr 2fr;gap:22px;}
/* Filter panel */
.filters{background:rgba(255,255,255,.025);border:1px solid rgba(255,179,0,.12);border-radius:10px;padding:16px 20px;margin-bottom:24px;display:flex;flex-direction:column;gap:10px;}
.filter-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.filter-lbl{font-family:'Space Mono',monospace;font-size:9px;color:var(--warm);letter-spacing:1px;text-transform:uppercase;white-space:nowrap;width:80px;flex-shrink:0;}
.pill{font-family:'Space Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--warm);border-radius:20px;padding:4px 12px;cursor:pointer;transition:.2s;white-space:nowrap;}
.pill:hover{border-color:rgba(255,179,0,.4);color:var(--gold);}
.pill.active{background:rgba(255,179,0,.14);border-color:rgba(255,179,0,.5);color:var(--gold);}
.pill.dim{opacity:.28;pointer-events:none;}
.fdivider{width:1px;height:20px;background:rgba(255,255,255,.1);margin:0 2px;flex-shrink:0;}
select.ssel{font-family:'Space Mono',monospace;font-size:9px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);color:var(--off);border-radius:20px;padding:4px 26px 4px 12px;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23C8C0B0'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center;transition:.2s;max-width:200px;}
select.ssel:hover,select.ssel:focus{border-color:rgba(255,179,0,.45);color:var(--gold);}
select.ssel option{background:#0D2B52;color:var(--off);}
/* Bar charts */
.bar-list{display:flex;flex-direction:column;gap:8px;}
.bar-row{display:flex;align-items:center;gap:9px;animation:fi .5s ease both;}
@keyframes fi{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
.b-rank{font-family:'Space Mono',monospace;font-size:9px;color:var(--warm);width:15px;text-align:right;flex-shrink:0;}
.b-label{font-size:12px;font-weight:600;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.b-label.wide{width:180px;}
.b-label.narrow{width:140px;}
.b-track{flex:1;height:20px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden;}
.b-fill{height:100%;border-radius:3px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;transition:width 1s cubic-bezier(.25,1,.5,1);}
.b-fill.to{background:linear-gradient(90deg,var(--blue),#2E86DE);}
.b-fill.from{background:linear-gradient(90deg,#8B2FC9,var(--purple));}
.b-fill.ret{background:linear-gradient(90deg,var(--green),#81C784);}
.b-val{font-family:'Space Mono',monospace;font-size:10px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.5);}
/* Insight strip */
.istrip{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px;}
.ibox{border:1px solid var(--border);border-radius:10px;padding:18px 16px;background:rgba(255,179,0,.04);}
.ibox .big{font-family:'Bebas Neue',sans-serif;font-size:42px;color:var(--gold);line-height:1;}
.ibox .big sup{font-size:18px;}
.ibox .ilbl{font-size:13px;font-weight:600;margin-top:3px;}
.ibox .idesc{font-size:11px;color:var(--warm);margin-top:4px;line-height:1.5;}
.legend{display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;}
.ld{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--warm);}
.ld-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0;}
/* Stat grid (7 tiles) */
.sgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;}
.sc{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:12px 7px;text-align:center;}
.sc-lbl{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:1px;color:var(--warm);text-transform:uppercase;margin-bottom:8px;}
.sc-val{font-family:'Bebas Neue',sans-serif;font-size:22px;line-height:1;letter-spacing:.5px;}
.sc-val.tr{color:var(--gold);}
.sc-val.fr{color:var(--warm);opacity:.7;}
.sc-tag{font-size:7px;letter-spacing:1px;text-transform:uppercase;color:var(--warm);opacity:.55;}
.sc-div{width:100%;height:1px;background:rgba(255,255,255,.08);margin:4px 0;}
.sc-up{font-family:'Space Mono',monospace;font-size:8px;margin-top:3px;}
/* Radar */
.radar-wrap{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center;margin-top:24px;}
.tw{border-left:3px solid var(--gold);padding:10px 14px;background:rgba(255,179,0,.04);border-radius:0 7px 7px 0;margin-bottom:10px;}
.tw.b{border-color:var(--cyan);}
.tw.g{border-color:var(--green);}
.tw-ttl{font-family:'Space Mono',monospace;font-size:9px;font-weight:700;color:var(--gold);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;}
.tw.b .tw-ttl{color:var(--cyan);}
.tw.g .tw-ttl{color:var(--green);}
.tw p{font-size:12px;color:var(--off);line-height:1.5;font-weight:300;}
.tw strong{font-weight:600;color:var(--gold);}
.tw.b strong{color:var(--cyan);}
.tw.g strong{color:var(--green);}
/* Change grid (pre/post, yr1/yr2) */
.cgrid{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;}
.cc{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:12px 7px;text-align:center;}
.cc-lbl{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:1px;color:var(--warm);text-transform:uppercase;margin-bottom:6px;}
.cc-val{font-family:'Bebas Neue',sans-serif;font-size:18px;line-height:1;}
.cc-val.pre{color:var(--cyan);}
.cc-val.post{color:var(--gold);}
.cc-val.yr1c{color:var(--cyan);}
.cc-val.yr2c{color:var(--gold);}
.cc-tag{font-size:7px;letter-spacing:1px;text-transform:uppercase;color:var(--warm);opacity:.55;}
.cc-delta{font-family:'Space Mono',monospace;font-size:8px;font-weight:700;margin-top:5px;padding:2px 6px;border-radius:8px;display:inline-block;}
.cc-delta.pos{background:rgba(76,175,80,.15);color:var(--green);border:1px solid rgba(76,175,80,.3);}
.cc-delta.neg{background:rgba(239,83,80,.15);color:var(--red);border:1px solid rgba(239,83,80,.3);}
.cc-delta.neu{background:rgba(255,255,255,.06);color:var(--warm);border:1px solid rgba(255,255,255,.15);}
.cc-n{font-family:'Space Mono',monospace;font-size:7px;color:var(--warm);opacity:.35;margin-top:2px;}
/* Faceted chart pair */
.chart-pair{display:grid;grid-template-columns:5fr 2fr;gap:16px;align-items:start;}
/* Dev groups */
.dev-con{display:flex;flex-direction:column;gap:18px;}
.dg{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:20px 24px;position:relative;overflow:hidden;}
.dg::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;}
.dg.never::before{background:linear-gradient(90deg,var(--cyan),transparent);}
.dg.once::before{background:linear-gradient(90deg,var(--gold),transparent);}
.dg.twice::before{background:linear-gradient(90deg,var(--purple),transparent);}
.dg-hdr{display:flex;align-items:baseline;gap:12px;margin-bottom:16px;}
.dg-title{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:1px;}
.dg.never .dg-title{color:var(--cyan);}
.dg.once .dg-title{color:var(--gold);}
.dg.twice .dg-title{color:var(--purple);}
.dg-n{font-family:'Space Mono',monospace;font-size:9px;color:var(--warm);}
.dbr{display:flex;align-items:center;gap:12px;margin-bottom:8px;}
.dbl{font-family:'Space Mono',monospace;font-size:9px;color:var(--warm);width:52px;text-align:right;flex-shrink:0;}
.dbs{flex:1;display:flex;flex-direction:column;gap:3px;}
.dt{height:12px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden;}
.df-f{height:100%;background:rgba(200,192,176,.28);border-radius:3px;transition:width 1.1s cubic-bezier(.25,1,.5,1);}
.df-s{height:100%;border-radius:3px;transition:width 1.1s cubic-bezier(.25,1,.5,1);}
.dg.never .df-s{background:rgba(126,200,227,.6);}
.dg.once .df-s{background:rgba(255,179,0,.6);}
.dg.twice .df-s{background:rgba(224,64,251,.6);}
.dbv{display:flex;gap:8px;font-family:'Space Mono',monospace;font-size:9px;color:var(--warm);align-items:center;}
.dbadge{font-family:'Space Mono',monospace;font-size:8px;padding:1px 6px;border-radius:8px;background:rgba(76,175,80,.15);color:var(--green);border:1px solid rgba(76,175,80,.3);}
.dbadge.neg{background:rgba(239,83,80,.15);color:var(--red);border-color:rgba(239,83,80,.3);}
.nodata{padding:14px;font-size:12px;color:var(--warm);opacity:.4;font-style:italic;}
/* UCLA flow table */
.flow-table{width:100%;border-collapse:collapse;}
.flow-table th{font-family:'Space Mono',monospace;font-size:8px;letter-spacing:1px;color:var(--gold);text-transform:uppercase;padding:6px 10px;border-bottom:1px solid var(--border);text-align:left;}
.flow-table td{font-size:12px;padding:7px 10px;border-bottom:1px solid rgba(255,255,255,.05);}
.flow-table tr:last-child td{border-bottom:none;}
.flow-table tr:hover td{background:rgba(255,255,255,.03);}
.flow-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:7px;vertical-align:middle;}
/* UCLA hero */
.ucla-hero{background:linear-gradient(135deg,rgba(27,75,138,.4),rgba(13,43,82,.6));border:1px solid rgba(255,179,0,.35);border-radius:14px;padding:36px 32px;position:relative;overflow:hidden;}
.ucla-hero::after{content:'UCLA';position:absolute;right:-14px;top:-14px;font-family:'Bebas Neue',sans-serif;font-size:150px;color:rgba(255,179,0,.04);pointer-events:none;line-height:1;}
.urow{display:grid;grid-template-columns:repeat(7,1fr);gap:14px;margin-top:22px;}
.usi{text-align:center;}
.usi-lbl{font-family:'Space Mono',monospace;font-size:8px;color:var(--warm);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;}
.usi-val{font-family:'Bebas Neue',sans-serif;font-size:28px;color:var(--gold);line-height:1;}
.usi-bar{height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin:5px 0 3px;overflow:hidden;}
.usi-fill{height:100%;background:var(--gold);border-radius:2px;transition:width 1.2s cubic-bezier(.25,1,.5,1);}
.usi-comp{font-family:'Space Mono',monospace;font-size:8px;color:var(--warm);}
.badge-up{display:inline-block;background:rgba(76,175,80,.2);border:1px solid rgba(76,175,80,.4);border-radius:20px;padding:1px 7px;font-family:'Space Mono',monospace;font-size:8px;color:var(--green);margin-top:3px;}
.note{font-family:'Space Mono',monospace;font-size:9px;color:var(--warm);opacity:.6;margin-top:10px;line-height:1.6;border-left:2px solid rgba(255,179,0,.25);padding-left:10px;}
.sub-lbl{margin-top:40px;margin-bottom:8px;font-family:'Space Mono',monospace;font-size:10px;color:var(--gold);letter-spacing:2px;text-transform:uppercase;}
.sub-desc{font-size:12px;color:var(--warm);font-weight:300;margin-bottom:14px;max-width:640px;line-height:1.6;}
footer{border-top:1px solid var(--border);padding:22px 0;margin-top:52px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;}
.foot-l{font-family:'Space Mono',monospace;font-size:9px;color:var(--warm);line-height:1.7;}
.foot-r{font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--gold);opacity:.45;letter-spacing:3px;}
@media(max-width:960px){.g2,.g2-asym,.sgrid,.cgrid,.urow,.chart-pair{grid-template-columns:1fr}.istrip{grid-template-columns:1fr}.radar-wrap{grid-template-columns:1fr}}
</style>
</head>
<body>
<nav><div class="nav-inner">
  <button class="nb active" onclick="navTo(event,'s1')">01 Transfer Flow</button>
  <button class="nb" onclick="navTo(event,'s2')">02 Frosh vs Transfer</button>
  <button class="nb" onclick="navTo(event,'s3')">03 Pre/Post Transfer</button>
  <button class="nb" onclick="navTo(event,'s4')">04 Career Development</button>
  <button class="nb" onclick="navTo(event,'s5')">05 Why UCLA</button>
</div></nav>
<div class="wrap">

<header><div class="hdr">
  <div style="display:flex;align-items:center;gap:16px;">
    <div class="mark">B</div>
    <div>
      <div style="font-family:'Space Mono',monospace;font-size:9px;letter-spacing:3px;color:var(--gold);margin-bottom:5px;">POWER 5 WBB · TRANSFER ANALYSIS</div>
      <h1>UCLA Women's Basketball<br><span>Transfer Intelligence</span> Report</h1>
    </div>
  </div>
  <div class="meta"><strong>DATA SCOPE</strong>81 Power 5 Programs<br>All Seasons on Record<br>3,306 Freshman Seasons<br>1,354 Transfer Arrivals</div>
</div></header>

<!-- SECTION 1 -->
<section class="sec" id="s1">
  <div class="sec-lbl">Section 01</div>
  <div class="sec-title">Transfer Market: Where Players Move</div>
  <div class="sec-sub">Top 10 destinations and origins among Power 5 programs.</div>
  <div class="g2" style="margin-bottom:22px;">
    <div class="card"><div class="card-title">▲ Top 10 Transfer Destinations — All P5</div><div class="bar-list" id="chart-to"></div></div>
    <div class="card"><div class="card-title">▼ Top 10 Transfer Origins — All P5</div><div class="bar-list" id="chart-from"></div></div>
  </div>
  <div class="g2">
    <div class="card"><div class="card-title">▲ UCLA Transfers In — By Season</div>
      <table class="flow-table" id="ucla-in-table"></table>
    </div>
    <div class="card"><div class="card-title">▼ UCLA Transfers Out — By Season</div>
      <table class="flow-table" id="ucla-out-table"></table>
    </div>
  </div>
</section>

<!-- SECTION 2 -->
<section class="sec" id="s2">
  <div class="sec-lbl">Section 02</div>
  <div class="sec-title">The Transfer Advantage: Freshmen vs. Transfer Arrivals</div>
  <div class="sec-sub">Average first-season stats for freshmen vs. transfer arrivals at P5 schools.</div>
  <div class="filters">""" + filter_bar('s2') + """
  </div>
  <div class="istrip" id="s2-ins"></div>
  <div class="legend">
    <div class="ld"><div class="ld-dot" style="background:var(--warm);opacity:.6"></div>Freshman Season</div>
    <div class="ld"><div class="ld-dot" style="background:var(--gold)"></div>First Season After Transfer</div>
  </div>
  <div class="card"><div class="card-title" id="s2-ctitle"></div><div class="sgrid" id="s2-grid"></div></div>
  <div class="radar-wrap">
    <div style="max-width:340px;margin:0 auto;width:100%;aspect-ratio:1;"><canvas id="s2Radar"></canvas></div>
    <div id="s2-takeaways"></div>
  </div>
</section>

<!-- SECTION 3 -->
<section class="sec" id="s3">
  <div class="sec-lbl">Section 03</div>
  <div class="sec-title">Performance Change: Season Before vs. After Transferring</div>
  <div class="sec-sub">Each transfer player's last season at their old school vs. first season at their new P5 school.</div>
  <div class="filters">""" + filter_bar('s3') + """
  </div>
  <div class="legend">
    <div class="ld"><div class="ld-dot" style="background:var(--cyan)"></div>Pre-Transfer (last season at old school)</div>
    <div class="ld"><div class="ld-dot" style="background:var(--gold)"></div>Post-Transfer (first season at new school)</div>
  </div>
  <div class="card"><div class="card-title" id="s3-ctitle"></div><div class="cgrid" id="s3-grid"></div></div>
  <div style="margin-top:18px;" class="card">
    <div class="card-title">Pre vs Post — Rate Stats</div>
    <div class="chart-pair">
      <div><canvas id="s3ChartRate"></canvas></div>
      <div><canvas id="s3ChartPct"></canvas></div>
    </div>
  </div>
</section>

<!-- SECTION 4 -->
<section class="sec" id="s4">
  <div class="sec-lbl">Section 04</div>
  <div class="sec-title">Career Development & Year-2 Growth</div>
  <div class="sec-sub">Three lenses on player development: freshman-to-senior career arc, Year 1 vs Year 2 acclimation, and transfer retention rates.</div>

  <div class="sub-lbl">4A — Freshman → Senior Career Arc</div>
  <p class="sub-desc">Filtered by the school where the player completed their senior season. Position based on senior-year designation.</p>
  <div class="filters">""" + filter_bar('s4a') + """
  </div>
  <div class="legend">
    <div class="ld"><div class="ld-dot" style="background:rgba(200,192,176,.4)"></div>Freshman Year</div>
    <div class="ld"><div class="ld-dot" style="background:var(--cyan);opacity:.7"></div>Senior — Never Transferred</div>
    <div class="ld"><div class="ld-dot" style="background:var(--gold);opacity:.7"></div>Senior — Transferred Once</div>
    <div class="ld"><div class="ld-dot" style="background:var(--purple);opacity:.7"></div>Senior — Transferred 2+</div>
  </div>
  <div class="dev-con" id="s4a-con"></div>
  <div style="margin-top:20px;" class="card">
    <div class="card-title">Career Delta (Freshman → Senior) by Transfer Group</div>
    <div class="chart-pair">
      <div><canvas id="s4aChartRate"></canvas></div>
      <div><canvas id="s4aChartPct"></canvas></div>
    </div>
  </div>

  <div class="sub-lbl" style="margin-top:44px;">4B — Year 1 → Year 2 Acclimation at New School</div>
  <p class="sub-desc">Transfers who stayed for a second season. Excludes players who transferred again.</p>
  <div class="filters">""" + filter_bar('s4b') + """
  </div>
  <div class="legend">
    <div class="ld"><div class="ld-dot" style="background:var(--cyan)"></div>Year 1 at New School</div>
    <div class="ld"><div class="ld-dot" style="background:var(--gold)"></div>Year 2 at New School</div>
  </div>
  <div class="card"><div class="card-title" id="s4b-ctitle"></div><div class="cgrid" id="s4b-grid"></div></div>
  <div style="margin-top:18px;" class="card">
    <div class="card-title">Year 1 → Year 2 Improvement</div>
    <div class="chart-pair">
      <div><canvas id="s4bChartRate"></canvas></div>
      <div><canvas id="s4bChartPct"></canvas></div>
    </div>
  </div>
  <div class="note" id="s4b-note" style="margin-top:12px;"></div>

  <div class="sub-lbl" style="margin-top:44px;">4C — Transfer Retention Rankings</div>
  <p class="sub-desc">What percentage of incoming transfers never transferred again? Min 5 transfers to qualify.</p>
  <div class="istrip" style="grid-template-columns:1fr 1fr 1fr;">
    <div class="ibox"><div class="big">90<sup>%</sup></div><div class="ilbl">UCLA Transfer Retention</div><div class="idesc">9 of 10 transfers who chose UCLA never left. Ranked <span id="ucla-ret-rank">—</span> of 78 qualifying P5 programs.</div></div>
    <div class="ibox"><div class="big" id="ucla-frosh-ret-big">—</div><div class="ilbl">UCLA Freshman Retention</div><div class="idesc"><span id="ucla-frosh-ret-desc">—</span></div></div>
    <div class="ibox"><div class="big" id="overall-ret-big">—</div><div class="ilbl">P5-Wide Transfer Avg</div><div class="idesc">Average retention rate across all 78 P5 programs with 5+ qualifying transfers.</div></div>
  </div>
  <div class="g2">
    <div class="card"><div class="card-title">Top 15 Retention Rates (min 5 transfers)</div><div class="bar-list" id="ret-top"></div></div>
    <div class="card"><div class="card-title">Bottom 15 Retention Rates (min 5 transfers)</div><div class="bar-list" id="ret-bot"></div></div>
  </div>
</section>

<!-- SECTION 5 -->
<section class="sec" id="s5">
  <div class="sec-lbl">Section 05</div>
  <div class="sec-title">Why UCLA? The Transfer Performance Case</div>
  <div class="sec-sub">First-season stats for transfers who chose UCLA vs all other P5 programs. UCLA n=10.</div>
  <div class="filters">
    <div class="filter-row">
      <span class="filter-lbl">Stats:</span>
      <button class="pill active" data-group="s5stat" data-val="pg">Per Game</button>
      <button class="pill" data-group="s5stat" data-val="p40">Per 40 Min</button>
    </div>
  </div>
  <div class="ucla-hero">
    <div style="display:flex;align-items:baseline;gap:16px;margin-bottom:5px;">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:40px;color:var(--gold);letter-spacing:3px;line-height:1;">UCLA TRANSFERS</div>
      <div style="font-family:'Space Mono',monospace;font-size:9px;color:var(--warm);line-height:1.8;">vs ALL OTHER P5<br>TRANSFERS</div>
    </div>
    <div style="font-size:12px;color:var(--warm);font-weight:300;max-width:460px;line-height:1.6;">Transfers arriving at UCLA post higher averages across tracked stats — plus a 90% retention rate ranking in the top quarter of all P5 programs.</div>
    <div class="urow" id="s5-ucla-row"></div>
  </div>
  <div style="margin-top:18px;" class="card">
    <div class="card-title" id="s5-chart-title">UCLA vs. Other P5 Transfers — Rate Stats (Per Game)</div>
    <div class="chart-pair">
      <div><canvas id="s5ChartRate"></canvas></div>
      <div><canvas id="s5ChartPct"></canvas></div>
    </div>
  </div>
  <div class="note" style="margin-top:12px;">UCLA n=10. Per 40 min uses only seasons with >5 mpg. Small sample — interpret direction of advantage, not magnitude alone.</div>
</section>

<footer>
  <div class="foot-l">Data: Basketball Reference · P5: ACC, Big Ten, Big 12, SEC, Big East + Washington State + Oregon State<br>
  Non-P5→P5 transfers included. Per 40 min requires >5 mpg. Year-2 excludes re-transfers. Dev section position uses senior-year designation.</div>
  <div class="foot-r">UCLA WBB</div>
</footer>
</div>

<script>
const DATA = """ + DATA_JSON + """;

// ── Constants ────────────────────────────────────────────────────────────────
const SK_PG  = ['pts_per_g','trb_per_g','ast_per_g','fg_pct','fg3_pct','blk_per_g','stl_per_g'];
const SK_P40 = ['pts_per_g_p40','trb_per_g_p40','ast_per_g_p40','fg_pct','fg3_pct','blk_per_g_p40','stl_per_g_p40'];
const SK_RATE_PG  = ['pts_per_g','trb_per_g','ast_per_g','blk_per_g','stl_per_g'];
const SK_RATE_P40 = ['pts_per_g_p40','trb_per_g_p40','ast_per_g_p40','blk_per_g_p40','stl_per_g_p40'];
const SK_PCT  = ['fg_pct','fg3_pct'];
const SL_RATE_PG  = ['PTS/G','REB/G','AST/G','BLK/G','STL/G'];
const SL_RATE_P40 = ['PTS/40','REB/40','AST/40','BLK/40','STL/40'];
const SL_PCT  = ['FG%','3FG%'];
const SL_ALL  = ['PTS','REB','AST','FG%','3FG%','BLK','STL'];
const SL_PG   = ['PTS/G','REB/G','AST/G','FG%','3FG%','BLK/G','STL/G'];
const SL_P40  = ['PTS/40','REB/40','AST/40','FG%','3FG%','BLK/40','STL/40'];

const DEV_CFG = [
  {key:'never',title:'Never Transferred',cls:'never'},
  {key:'once', title:'Transferred Once', cls:'once'},
  {key:'twice_plus',title:'Transferred 2+ Times',cls:'twice'}
];
const DEV_MAX = {};
SK_PG.forEach(function(k) {
  var mx = 0.001;
  DEV_CFG.forEach(function(cfg) {
    var grp = DATA.dev['All|All|All'][cfg.key];
    var v = grp && grp[k];
    if (v) { mx = Math.max(mx, v.frosh||0, v.senior||0); }
  });
  DEV_MAX[k] = mx;
});

// ── Chart defaults ─────────────────────────────────────────────────────────
const CHART_OPTS = {
  responsive:true,
  plugins:{
    legend:{labels:{color:'#C8C0B0',font:{family:'DM Sans',size:11},padding:14}},
    tooltip:{backgroundColor:'#0D2B52',borderColor:'rgba(255,179,0,.3)',borderWidth:1,titleColor:'#FFB300',bodyColor:'#F5F0E8'}
  },
  scales:{
    x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:10}}},
    y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:9}}}
  }
};
function chartOpts(extra) {
  var o = JSON.parse(JSON.stringify(CHART_OPTS));
  if (extra) Object.assign(o, extra);
  return o;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function isPct(k) { return k === 'fg_pct' || k === 'fg3_pct'; }
function fv(v, k) {
  if (v == null || isNaN(v)) return '—';
  return isPct(k) ? (v*100).toFixed(1)+'%' : v.toFixed(1);
}
function fd(v, k) {
  if (v == null || isNaN(v)) return '—';
  var s = isPct(k) ? (v*100).toFixed(1)+'%' : v.toFixed(2);
  return (v >= 0 ? '+' : '') + s;
}
function pctDiff(a, b) {
  return (a != null && b != null && b !== 0) ? Math.round((a-b)/Math.abs(b)*100) : null;
}
function navTo(e, id) {
  document.getElementById(id).scrollIntoView({behavior:'smooth'});
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('active');});
  e.target.classList.add('active');
}
function setupPills(group, fn) {
  document.querySelectorAll('.pill[data-group="'+group+'"]').forEach(function(p){
    p.addEventListener('click', function(e){
      document.querySelectorAll('.pill[data-group="'+group+'"]').forEach(function(x){x.classList.remove('active');});
      e.target.classList.add('active');
      fn(e.target.dataset.val);
    });
  });
}
function populateSel(id) {
  var sel = document.getElementById(id);
  if (!sel) return;
  var opt0 = document.createElement('option');
  opt0.value='All'; opt0.textContent='All Schools';
  sel.appendChild(opt0);
  DATA.all_schools.forEach(function(pair){
    var opt = document.createElement('option');
    opt.value=pair[0]; opt.textContent=pair[1];
    sel.appendChild(opt);
  });
}
function schoolLabel(slug) {
  var f = DATA.all_schools.find(function(p){return p[0]===slug;});
  return f ? f[1] : slug;
}
function getFilterLabel(pos, conf, school) {
  var parts = [];
  if (pos !== 'All') parts.push(pos==='G'?'Guards':pos==='F'?'Forwards':'Centers');
  if (school !== 'All') parts.push(schoolLabel(school));
  else if (conf !== 'All') parts.push(conf);
  return parts.length ? parts.join(' · ') : 'All P5';
}
function getSK(stat) { return stat==='p40' ? SK_P40 : SK_PG; }
function getSL(stat) { return stat==='p40' ? SL_P40 : SL_PG; }
function getSKRate(stat) { return stat==='p40' ? SK_RATE_P40 : SK_RATE_PG; }
function getSLRate(stat) { return stat==='p40' ? SL_RATE_P40 : SL_RATE_PG; }
// Destroy & recreate a Chart stored in a variable held by caller
function mkChart(canvas, cfg) {
  return new Chart(document.getElementById(canvas), cfg);
}

// Faceted bar chart: rate + pct separate
function makeFacetedBar(rateCanvasId, pctCanvasId, labels_rate, labels_pct, datasets_rate, datasets_pct, rateObjs, pctObjs) {
  if (rateObjs[0]) rateObjs[0].destroy();
  if (rateObjs[1]) rateObjs[1].destroy(); // won't be used but keep api consistent
  if (pctObjs[0]) pctObjs[0].destroy();
  rateObjs[0] = new Chart(document.getElementById(rateCanvasId), {
    type:'bar', data:{labels:labels_rate,datasets:datasets_rate},
    options: chartOpts({plugins:{legend:{labels:{color:'#C8C0B0',font:{family:'DM Sans',size:11},padding:10}},
      tooltip:{backgroundColor:'#0D2B52',borderColor:'rgba(255,179,0,.3)',borderWidth:1,titleColor:'#FFB300',bodyColor:'#F5F0E8'}}})
  });
  pctObjs[0] = new Chart(document.getElementById(pctCanvasId), {
    type:'bar', data:{labels:labels_pct,datasets:datasets_pct},
    options: chartOpts({plugins:{legend:{display:false},
      tooltip:{backgroundColor:'#0D2B52',borderColor:'rgba(255,179,0,.3)',borderWidth:1,titleColor:'#FFB300',bodyColor:'#F5F0E8'}},
      scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:10}}},
        y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:9},callback:function(v){return (v*100).toFixed(0)+'%';}},
        max:1.0}}})
  });
}

// ── Section 1: Transfer Flow ──────────────────────────────────────────────────
function renderBars(id, items, cls, labelW) {
  var el = document.getElementById(id);
  var mx = Math.max.apply(null, items.map(function(x){return x[1];}));
  items.forEach(function(item, i){
    el.innerHTML += '<div class="bar-row" style="animation-delay:'+(i*48)+'ms">' +
      '<span class="b-rank">'+(i+1)+'</span>' +
      '<span class="b-label '+(labelW||'narrow')+'">'+item[0]+'</span>' +
      '<div class="b-track"><div class="b-fill '+cls+'" style="width:0" data-w="'+(item[1]/mx*100).toFixed(1)+'%">' +
      '<span class="b-val">'+item[1]+'</span></div></div></div>';
  });
}
renderBars('chart-to',   DATA.top_to,   'to');
renderBars('chart-from', DATA.top_from, 'from');
setTimeout(function(){document.querySelectorAll('.b-fill[data-w]').forEach(function(e){e.style.width=e.dataset.w;});},100);

// UCLA flow tables
function renderFlowTable(id, rows, fromLabel, toLabel) {
  var el = document.getElementById(id);
  el.innerHTML = '<tr><th>Player</th><th>'+fromLabel+'</th><th>Season</th></tr>';
  rows.forEach(function(r){
    el.innerHTML += '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td></tr>';
  });
}
renderFlowTable('ucla-in-table',  DATA.ucla_in_flow,  'From', 'Season');
renderFlowTable('ucla-out-table', DATA.ucla_out_flow, 'To',   'Season');

// ── Section 2 ───────────────────────────────────────────────────────────────
var s2pos='All', s2conf='All', s2school='All', s2stat='pg';
var s2Radar=null;

function getS2() {
  var db = s2stat==='p40' ? DATA.s2_p40 : DATA.s2_pg;
  var key = s2school!=='All' ? s2pos+'|All|'+s2school : s2pos+'|'+s2conf+'|All';
  return db[key] || db['All|All|All'];
}
function renderS2() {
  var d=getS2(), sk=getSK(s2stat), sl=getSL(s2stat);
  var label=getFilterLabel(s2pos,s2conf,s2school);
  var mode=s2stat==='p40'?' (Per 40 Min)':' (Per Game)';
  document.getElementById('s2-ctitle').textContent = label+mode+' — Avg First Season Stats';

  var pts=d[sk[0]], reb=d[sk[1]], ast=d[sk[2]];
  var pU=pctDiff(pts&&pts.transfer,pts&&pts.freshman);
  var rU=pctDiff(reb&&reb.transfer,reb&&reb.freshman);
  var aU=pctDiff(ast&&ast.transfer,ast&&ast.freshman);
  document.getElementById('s2-ins').innerHTML=[
    [pU,'Scoring Advantage','Transfers avg '+fv(pts&&pts.transfer,sk[0])+' vs '+fv(pts&&pts.freshman,sk[0])+' for freshmen.'],
    [rU,'Rebounding Advantage','Transfers avg '+fv(reb&&reb.transfer,sk[1])+' vs '+fv(reb&&reb.freshman,sk[1])+' for freshmen.'],
    [aU,'Assists Advantage','n = '+(pts?pts.n_t:'—')+' transfer, '+(pts?pts.n_f:'—')+' freshman seasons.'],
  ].map(function(r){
    return '<div class="ibox"><div class="big">'+(r[0]!=null?(r[0]>=0?'+':'')+r[0]:'—')+'<sup>%</sup></div>'+
      '<div class="ilbl">'+r[1]+'</div><div class="idesc">'+r[2]+'</div></div>';
  }).join('');

  document.getElementById('s2-grid').innerHTML=sk.map(function(k,i){
    var v=d[k]; if(!v)return'';
    var diff=pctDiff(v.transfer,v.freshman);
    var dc=diff==null?'var(--warm)':diff>=0?'var(--green)':'var(--red)';
    return '<div class="sc"><div class="sc-lbl">'+sl[i]+'</div>'+
      '<div class="sc-val tr">'+fv(v.transfer,k)+'</div><div class="sc-tag">TRANSFER</div>'+
      '<div class="sc-div"></div>'+
      '<div class="sc-val fr">'+fv(v.freshman,k)+'</div><div class="sc-tag">FRESHMAN</div>'+
      '<div class="sc-up" style="color:'+dc+'">'+(diff!=null?(diff>=0?'+':'')+diff+'%':'—')+'</div></div>';
  }).join('');

  var wins=sk.filter(function(k){var v=d[k];return v&&v.transfer>v.freshman;}).length;
  var fg=d[sk[3]];
  document.getElementById('s2-takeaways').innerHTML=
    '<div class="tw"><div class="tw-ttl">Immediate Impact</div><p>Transfers outperform freshmen in <strong>'+wins+' of '+sk.length+'</strong> stats in this filter.</p></div>'+
    '<div class="tw b"><div class="tw-ttl">Shooting Efficiency</div><p>Transfers shoot <strong>'+fv(fg&&fg.transfer,sk[3])+'</strong> vs <strong>'+fv(fg&&fg.freshman,sk[3])+'</strong> for freshmen.</p></div>'+
    '<div class="tw g"><div class="tw-ttl">Recruiting ROI</div><p>Transfers deliver more production in year one across every conference and position. Per 40 min removes the playing-time gap and the advantage persists.</p></div>';

  var frV=sk.map(function(k){var v=d[k];return v&&v.freshman?v.freshman:0;});
  var trV=sk.map(function(k){var v=d[k];return v&&v.transfer?v.transfer:0;});
  var mx=sk.map(function(_,i){return Math.max(frV[i],trV[i],0.001);});
  if(s2Radar)s2Radar.destroy();
  s2Radar=new Chart(document.getElementById('s2Radar'),{type:'radar',data:{labels:SL_ALL,datasets:[
    {label:'Transfer',data:trV.map(function(v,i){return v/mx[i];}),backgroundColor:'rgba(255,179,0,.12)',borderColor:'#FFB300',pointBackgroundColor:'#FFB300',borderWidth:2.5,pointRadius:4},
    {label:'Freshman',data:frV.map(function(v,i){return v/mx[i];}),backgroundColor:'rgba(200,192,176,.06)',borderColor:'rgba(200,192,176,.4)',borderWidth:1.5,borderDash:[4,4],pointRadius:3},
  ]},options:{responsive:true,plugins:{legend:{labels:{color:'#C8C0B0',font:{family:'DM Sans',size:11},padding:12}}},
    scales:{r:{grid:{color:'rgba(255,255,255,.07)'},angleLines:{color:'rgba(255,255,255,.07)'},
      pointLabels:{color:'#C8C0B0',font:{family:'Space Mono',size:9}},ticks:{display:false},min:0,max:1}}}});
}
populateSel('s2-school');
setupPills('s2pos',  function(v){s2pos=v;renderS2();});
setupPills('s2conf', function(v){s2conf=v;s2school='All';document.getElementById('s2-school').value='All';document.querySelectorAll('.pill[data-group="s2conf"]').forEach(function(p){p.classList.remove('dim');});renderS2();});
setupPills('s2stat', function(v){s2stat=v;renderS2();});
document.getElementById('s2-school').addEventListener('change',function(e){s2school=e.target.value;document.querySelectorAll('.pill[data-group="s2conf"]').forEach(function(p){p.classList.toggle('dim',s2school!=='All');});renderS2();});
renderS2();

// ── Section 3 ───────────────────────────────────────────────────────────────
var s3pos='All', s3conf='All', s3school='All', s3stat='pg';
var s3ChartRate=null, s3ChartPct=null;

function getS3() {
  var db = s3stat==='p40' ? DATA.s3_p40 : DATA.s3_pg;
  var key = s3school!=='All' ? s3pos+'|All|'+s3school : s3pos+'|'+s3conf+'|All';
  return db[key] || db['All|All|All'];
}
function renderS3() {
  var d=getS3(), sk=getSK(s3stat), sl=getSL(s3stat);
  var skR=getSKRate(s3stat), slR=getSLRate(s3stat);
  var label=getFilterLabel(s3pos,s3conf,s3school);
  var mode=s3stat==='p40'?' (Per 40 Min)':' (Per Game)';
  document.getElementById('s3-ctitle').textContent=label+mode+' — Pre vs Post Transfer';

  document.getElementById('s3-grid').innerHTML=sk.map(function(k,i){
    var v=d[k]; if(!v)return'';
    var cls=v.delta==null?'neu':Math.abs(v.delta)<0.005?'neu':v.delta>0?'pos':'neg';
    return '<div class="cc"><div class="cc-lbl">'+sl[i]+'</div>'+
      '<div class="cc-val pre">'+fv(v.pre,k)+'</div><div class="cc-tag">PRE</div>'+
      '<div style="margin-top:5px"><div class="cc-val post">'+fv(v.post,k)+'</div><div class="cc-tag">POST</div></div>'+
      '<div class="cc-delta '+cls+'">'+fd(v.delta,k)+'</div>'+
      '<div class="cc-n">n='+v.n+'</div></div>';
  }).join('');

  var preR=skR.map(function(k){var v=d[k];return v?v.pre:null;});
  var postR=skR.map(function(k){var v=d[k];return v?v.post:null;});
  var preP=SK_PCT.map(function(k){var v=d[k];return v?v.pre:null;});
  var postP=SK_PCT.map(function(k){var v=d[k];return v?v.post:null;});

  if(s3ChartRate)s3ChartRate.destroy();
  if(s3ChartPct)s3ChartPct.destroy();
  s3ChartRate=new Chart(document.getElementById('s3ChartRate'),{type:'bar',data:{labels:slR,datasets:[
    {label:'Pre-Transfer', data:preR, backgroundColor:'rgba(126,200,227,.5)',borderColor:'rgba(126,200,227,.8)',borderWidth:1.5,borderRadius:4},
    {label:'Post-Transfer',data:postR,backgroundColor:'rgba(255,179,0,.65)',borderColor:'#FFB300',borderWidth:1.5,borderRadius:4},
  ]},options:chartOpts()});
  s3ChartPct=new Chart(document.getElementById('s3ChartPct'),{type:'bar',data:{labels:SL_PCT,datasets:[
    {label:'Pre-Transfer', data:preP, backgroundColor:'rgba(126,200,227,.5)',borderColor:'rgba(126,200,227,.8)',borderWidth:1.5,borderRadius:4},
    {label:'Post-Transfer',data:postP,backgroundColor:'rgba(255,179,0,.65)',borderColor:'#FFB300',borderWidth:1.5,borderRadius:4},
  ]},options:chartOpts({plugins:{legend:{display:false},tooltip:{backgroundColor:'#0D2B52',borderColor:'rgba(255,179,0,.3)',borderWidth:1,titleColor:'#FFB300',bodyColor:'#F5F0E8'}},
    scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:10}}},
      y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:9},callback:function(v){return(v*100).toFixed(0)+'%';}},max:1.0}}})});
}
populateSel('s3-school');
setupPills('s3pos',  function(v){s3pos=v;renderS3();});
setupPills('s3conf', function(v){s3conf=v;s3school='All';document.getElementById('s3-school').value='All';document.querySelectorAll('.pill[data-group="s3conf"]').forEach(function(p){p.classList.remove('dim');});renderS3();});
setupPills('s3stat', function(v){s3stat=v;renderS3();});
document.getElementById('s3-school').addEventListener('change',function(e){s3school=e.target.value;document.querySelectorAll('.pill[data-group="s3conf"]').forEach(function(p){p.classList.toggle('dim',s3school!=='All');});renderS3();});
renderS3();

// ── Section 4A: Career Dev ─────────────────────────────────────────────────
var s4apos='All', s4aconf='All', s4aschool='All', s4astat='pg';
var s4aChartRate=null, s4aChartPct=null;

function getS4Akey(){return s4aschool!=='All'?s4apos+'|All|'+s4aschool:s4apos+'|'+s4aconf+'|All';}
function getS4A(){return DATA.dev[getS4Akey()]||DATA.dev['All|All|All'];}

function renderS4A(){
  var d=getS4A();
  var useP40=s4astat==='p40';
  // Build stat key array: rate keys + pct keys, with _p40 suffix when needed
  var statKeys=SK_PG.map(function(k){ return useP40 ? k+'_p40' : k; });
  statKeys[3]=useP40?'fg_pct_p40':'fg_pct';
  statKeys[4]=useP40?'fg3_pct_p40':'fg3_pct';
  var statLabels=useP40?SL_P40:SL_PG;
  var skRate=useP40?SK_RATE_P40:SK_RATE_PG;
  var slRate=useP40?SL_RATE_P40:SL_RATE_PG;
  var skPctData=useP40?['fg_pct_p40','fg3_pct_p40']:SK_PCT;
  // Per-filter DEV_MAX for bar scaling
  var devMax={};
  statKeys.forEach(function(k){
    var mx=0.001;
    DEV_CFG.forEach(function(cfg){var grp=d[cfg.key],v=grp&&grp[k];if(v){mx=Math.max(mx,v.frosh||0,v.senior||0);}});
    devMax[k]=mx;
  });

  var cont=document.getElementById('s4a-con');
  cont.innerHTML='';
  DEV_CFG.forEach(function(cfg){
    var grp=d[cfg.key]; var bars='';
    if(grp&&grp.n>0){
      statKeys.forEach(function(k,i){
        var v=grp[k]; if(!v||v.frosh==null)return;
        var fW=Math.min(100,(v.frosh/devMax[k]*100)).toFixed(1);
        var sW=Math.min(100,(v.senior/devMax[k]*100)).toFixed(1);
        var ds=fd(v.delta,k); var neg=v.delta!=null&&v.delta<0;
        bars+='<div class="dbr"><span class="dbl">'+statLabels[i]+'</span>'+
          '<div class="dbs"><div class="dt"><div class="df-f" style="width:'+fW+'%"></div></div>'+
          '<div class="dt"><div class="df-s '+cfg.cls+'" style="width:'+sW+'%"></div></div></div>'+
          '<div class="dbv"><span>'+fv(v.frosh,k)+' \u2192 '+fv(v.senior,k)+'</span>'+
          '<span class="dbadge'+(neg?' neg':'')+'">'+ds+'</span></div></div>';
      });
    }
    cont.innerHTML+='<div class="dg '+cfg.cls+'">'+
      '<div class="dg-hdr"><div class="dg-title">'+cfg.title+'</div>'+
      '<div class="dg-n">n = '+(grp?grp.n:0)+' players \u00b7 freshman \u2192 senior season</div></div>'+
      (bars||'<div class="nodata">Insufficient data for this filter</div>')+'</div>';
  });

  var neverDelta_R=skRate.map(function(k){return d.never&&d.never[k]?d.never[k].delta:null;});
  var onceDelta_R =skRate.map(function(k){return d.once&&d.once[k]?d.once[k].delta:null;});
  var twiceDelta_R=skRate.map(function(k){return d.twice_plus&&d.twice_plus[k]?d.twice_plus[k].delta:null;});
  var neverDelta_P=skPctData.map(function(k){return d.never&&d.never[k]?d.never[k].delta:null;});
  var onceDelta_P =skPctData.map(function(k){return d.once&&d.once[k]?d.once[k].delta:null;});
  var twiceDelta_P=skPctData.map(function(k){return d.twice_plus&&d.twice_plus[k]?d.twice_plus[k].delta:null;});

  if(s4aChartRate)s4aChartRate.destroy();
  if(s4aChartPct) s4aChartPct.destroy();
  var dsStyle=[
    {label:'Never Transferred (\u0394)',backgroundColor:'rgba(126,200,227,.4)',borderColor:'rgba(126,200,227,.8)',borderWidth:1.5,borderRadius:4},
    {label:'Transferred Once (\u0394)',backgroundColor:'rgba(255,179,0,.5)',borderColor:'#FFB300',borderWidth:1.5,borderRadius:4},
    {label:'Transferred 2+ (\u0394)',backgroundColor:'rgba(224,64,251,.4)',borderColor:'rgba(224,64,251,.8)',borderWidth:1.5,borderRadius:4},
  ];
  var dsR=dsStyle.map(function(s,i){return Object.assign({},s,{data:[neverDelta_R,onceDelta_R,twiceDelta_R][i]});});
  var dsP=dsStyle.map(function(s,i){return Object.assign({},s,{label:['Never','Once','2+'][i],data:[neverDelta_P,onceDelta_P,twiceDelta_P][i]});});
  s4aChartRate=new Chart(document.getElementById('s4aChartRate'),{type:'bar',data:{labels:slRate,datasets:dsR},
    options:chartOpts({scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:10}}},
      y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:9}},
        title:{display:true,text:'\u0394 (Senior \u2212 Freshman)',color:'#C8C0B0',font:{size:10}}}}})});
  s4aChartPct=new Chart(document.getElementById('s4aChartPct'),{type:'bar',data:{labels:SL_PCT,datasets:dsP},
    options:chartOpts({plugins:{legend:{display:false},tooltip:{backgroundColor:'#0D2B52',borderColor:'rgba(255,179,0,.3)',borderWidth:1,titleColor:'#FFB300',bodyColor:'#F5F0E8'}},
      scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:10}}},
        y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:9},callback:function(v){return(v*100).toFixed(1)+'%';}},
          title:{display:true,text:'\u0394 %',color:'#C8C0B0',font:{size:10}}}}})});
}
populateSel('s4a-school');
setupPills('s4apos',  function(v){s4apos=v;renderS4A();});
setupPills('s4aconf', function(v){s4aconf=v;s4aschool='All';document.getElementById('s4a-school').value='All';document.querySelectorAll('.pill[data-group="s4aconf"]').forEach(function(p){p.classList.remove('dim');});renderS4A();});
setupPills('s4astat', function(v){s4astat=v;renderS4A();});
document.getElementById('s4a-school').addEventListener('change',function(e){s4aschool=e.target.value;document.querySelectorAll('.pill[data-group="s4aconf"]').forEach(function(p){p.classList.toggle('dim',s4aschool!=='All');});renderS4A();});
renderS4A();

// ── Section 4B: Year-2 ────────────────────────────────────────────────────
var s4bpos='All', s4bconf='All', s4bschool='All', s4bstat='pg';
var s4bChartRate=null, s4bChartPct=null;

function getS4B(){
  var db=s4bstat==='p40'?DATA.s4b_p40:DATA.s4b_pg;
  var key=s4bschool!=='All'?s4bpos+'|All|'+s4bschool:s4bpos+'|'+s4bconf+'|All';
  return db[key]||db['All|All|All'];
}
function renderS4B(){
  var d=getS4B(), sk=getSK(s4bstat), sl=getSL(s4bstat);
  var skR=getSKRate(s4bstat), slR=getSLRate(s4bstat);
  var label=getFilterLabel(s4bpos,s4bconf,s4bschool);
  var mode=s4bstat==='p40'?' (Per 40 Min)':' (Per Game)';
  document.getElementById('s4b-ctitle').textContent=label+mode+' — Yr1 vs Yr2 at New School';

  document.getElementById('s4b-grid').innerHTML=sk.map(function(k,i){
    var v=d[k]; if(!v)return'';
    var cls=v.delta==null?'neu':Math.abs(v.delta)<0.005?'neu':v.delta>0?'pos':'neg';
    return '<div class="cc"><div class="cc-lbl">'+sl[i]+'</div>'+
      '<div class="cc-val yr1c">'+fv(v.yr1,k)+'</div><div class="cc-tag">YEAR 1</div>'+
      '<div style="margin-top:5px"><div class="cc-val yr2c">'+fv(v.yr2,k)+'</div><div class="cc-tag">YEAR 2</div></div>'+
      '<div class="cc-delta '+cls+'">'+fd(v.delta,k)+'</div>'+
      '<div class="cc-n">n='+(v.n||'—')+'</div></div>';
  }).join('');

  var yr1R=skR.map(function(k){var v=d[k];return v?v.yr1:null;});
  var yr2R=skR.map(function(k){var v=d[k];return v?v.yr2:null;});
  var yr1P=SK_PCT.map(function(k){var v=d[k];return v?v.yr1:null;});
  var yr2P=SK_PCT.map(function(k){var v=d[k];return v?v.yr2:null;});

  var n=d[sk[0]]?d[sk[0]].n:'—';
  document.getElementById('s4b-note').textContent='n = '+n+' transfer seasons with Year-2 data in this filter.'+
    (s4bschool!=='All'&&n<10?' Small sample — interpret cautiously.':'')+' Year-2 only counted if player did not transfer again.';

  if(s4bChartRate)s4bChartRate.destroy();
  if(s4bChartPct)s4bChartPct.destroy();
  s4bChartRate=new Chart(document.getElementById('s4bChartRate'),{type:'bar',data:{labels:slR,datasets:[
    {label:'Year 1',data:yr1R,backgroundColor:'rgba(126,200,227,.5)',borderColor:'rgba(126,200,227,.8)',borderWidth:1.5,borderRadius:4},
    {label:'Year 2',data:yr2R,backgroundColor:'rgba(255,179,0,.65)',borderColor:'#FFB300',borderWidth:1.5,borderRadius:4},
  ]},options:chartOpts()});
  s4bChartPct=new Chart(document.getElementById('s4bChartPct'),{type:'bar',data:{labels:SL_PCT,datasets:[
    {label:'Year 1',data:yr1P,backgroundColor:'rgba(126,200,227,.5)',borderColor:'rgba(126,200,227,.8)',borderWidth:1.5,borderRadius:4},
    {label:'Year 2',data:yr2P,backgroundColor:'rgba(255,179,0,.65)',borderColor:'#FFB300',borderWidth:1.5,borderRadius:4},
  ]},options:chartOpts({plugins:{legend:{display:false},tooltip:{backgroundColor:'#0D2B52',borderColor:'rgba(255,179,0,.3)',borderWidth:1,titleColor:'#FFB300',bodyColor:'#F5F0E8'}},
    scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:10}}},
      y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:9},callback:function(v){return(v*100).toFixed(0)+'%';}},max:1.0}}})});
}
populateSel('s4b-school');
setupPills('s4bpos',  function(v){s4bpos=v;renderS4B();});
setupPills('s4bconf', function(v){s4bconf=v;s4bschool='All';document.getElementById('s4b-school').value='All';document.querySelectorAll('.pill[data-group="s4bconf"]').forEach(function(p){p.classList.remove('dim');});renderS4B();});
setupPills('s4bstat', function(v){s4bstat=v;renderS4B();});
document.getElementById('s4b-school').addEventListener('change',function(e){s4bschool=e.target.value;document.querySelectorAll('.pill[data-group="s4bconf"]').forEach(function(p){p.classList.toggle('dim',s4bschool!=='All');});renderS4B();});
renderS4B();

// ── Section 4C: Retention ─────────────────────────────────────────────────
var retRanked=DATA.retention_ranked;
document.getElementById('overall-ret-big').textContent=DATA.retention_overall+'%';
var uclaIdx=retRanked.findIndex(function(r){return r[0]==='ucla';});
document.getElementById('ucla-ret-rank').textContent=(uclaIdx+1)+' of '+retRanked.length;
var fr=DATA.ucla_frosh_retention;
document.getElementById('ucla-frosh-ret-big').textContent=fr.rate+'%';
document.getElementById('ucla-frosh-ret-desc').textContent=fr.stayed+' of '+fr.total+' freshmen who started at UCLA never transferred out.';
function renderRetBars(id,items,hlSlug){
  var el=document.getElementById(id);
  var mx=Math.max.apply(null,items.map(function(x){return x[2];}));
  items.forEach(function(item,i){
    var isHL=item[0]===hlSlug;
    el.innerHTML+='<div class="bar-row" style="animation-delay:'+(i*40)+'ms">'+
      '<span class="b-rank">'+(i+1)+'</span>'+
      '<span class="b-label wide" style="'+(isHL?'color:var(--gold)':'')+'">'+(item[1])+' ('+item[3]+')</span>'+
      '<div class="b-track"><div class="b-fill ret" style="width:0" data-w="'+(item[2]/mx*100).toFixed(1)+'%">'+
      '<span class="b-val">'+item[2]+'%</span></div></div></div>';
  });
}
renderRetBars('ret-top',retRanked.slice(0,15),'ucla');
renderRetBars('ret-bot',retRanked.slice().reverse().slice(0,15),'ucla');
setTimeout(function(){document.querySelectorAll('#ret-top .b-fill[data-w],#ret-bot .b-fill[data-w]').forEach(function(e){e.style.width=e.dataset.w;});},150);

// ── Section 5: Why UCLA ─────────────────────────────────────────────────────
var s5stat='pg', s5ChartRate=null, s5ChartPct=null;
function renderS5(){
  var isPG=s5stat==='pg';
  var db=isPG?DATA.ucla_stats:DATA.ucla_stats_p40;
  var skR=isPG?SK_RATE_PG:SK_RATE_P40, slR=isPG?SL_RATE_PG:SL_RATE_P40;
  var sk=getSK(s5stat), sl=getSL(s5stat);
  var mode=isPG?'Per Game':'Per 40 Min';
  document.getElementById('s5-chart-title').textContent='UCLA vs. Other P5 Transfers — Rate Stats ('+mode+')';

  var row=document.getElementById('s5-ucla-row');
  row.innerHTML='';
  sk.forEach(function(k,i){
    var u=db[k]&&db[k].ucla, o=db[k]&&db[k].other;
    var up=pctDiff(u,o);
    var mxW=u&&o?Math.round(u/Math.max(u,o)*90):50;
    row.innerHTML+='<div class="usi"><div class="usi-lbl">'+sl[i]+'</div>'+
      '<div class="usi-val">'+fv(u,k)+'</div>'+
      '<div class="usi-bar"><div class="usi-fill" style="width:0" data-w="'+mxW+'%"></div></div>'+
      '<div class="usi-comp">vs '+fv(o,k)+'</div>'+
      '<div class="badge-up">'+(up!=null?(up>=0?'+':'')+up+'%':'—')+'</div></div>';
  });
  setTimeout(function(){document.querySelectorAll('.usi-fill[data-w]').forEach(function(e){e.style.width=e.dataset.w;});},200);

  var uclaR=skR.map(function(k){return db[k]?db[k].ucla:null;});
  var otherR=skR.map(function(k){return db[k]?db[k].other:null;});
  var uclaP=SK_PCT.map(function(k){return db[k]?db[k].ucla:null;});
  var otherP=SK_PCT.map(function(k){return db[k]?db[k].other:null;});

  if(s5ChartRate)s5ChartRate.destroy();
  if(s5ChartPct)s5ChartPct.destroy();
  s5ChartRate=new Chart(document.getElementById('s5ChartRate'),{type:'bar',data:{labels:slR,datasets:[
    {label:'UCLA Transfers (n=10)',data:uclaR,backgroundColor:'rgba(255,179,0,.75)',borderColor:'#FFB300',borderWidth:1.5,borderRadius:4},
    {label:'Other P5 Transfers',  data:otherR,backgroundColor:'rgba(126,200,227,.25)',borderColor:'rgba(126,200,227,.6)',borderWidth:1.5,borderRadius:4},
  ]},options:chartOpts()});
  s5ChartPct=new Chart(document.getElementById('s5ChartPct'),{type:'bar',data:{labels:SL_PCT,datasets:[
    {label:'UCLA',data:uclaP,backgroundColor:'rgba(255,179,0,.75)',borderColor:'#FFB300',borderWidth:1.5,borderRadius:4},
    {label:'Other P5',data:otherP,backgroundColor:'rgba(126,200,227,.25)',borderColor:'rgba(126,200,227,.6)',borderWidth:1.5,borderRadius:4},
  ]},options:chartOpts({plugins:{legend:{display:false},tooltip:{backgroundColor:'#0D2B52',borderColor:'rgba(255,179,0,.3)',borderWidth:1,titleColor:'#FFB300',bodyColor:'#F5F0E8'}},
    scales:{x:{grid:{color:'rgba(255,255,255,.04)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:10}}},
      y:{grid:{color:'rgba(255,255,255,.05)'},ticks:{color:'#C8C0B0',font:{family:'Space Mono',size:9},callback:function(v){return(v*100).toFixed(0)+'%';}},max:1.0}}})});
}
setupPills('s5stat',function(v){s5stat=v;renderS5();});
renderS5();
</script>
</body>
</html>"""

with open('/home/claude/ucla_wbb_v9.html','w') as f:
    f.write(HTML)
print(f"Written: {len(HTML):,} chars")
