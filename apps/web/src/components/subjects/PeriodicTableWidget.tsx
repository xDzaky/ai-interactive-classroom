/**
 * PeriodicTableWidget.tsx — Interactive 118-Element Periodic Table (Lazy-Loaded, V8)
 *
 * Adapted from Honghe `GCPeriodicTablePlugin`:
 * All 118 IUPAC elements in compact tuple format (<5 KB), category filters,
 * atomic mass/group/phase inspector, and 1-click link to BuildAtomLab!
 */
import React, { useMemo, useState } from 'react';

type ElemTuple = [number, string, string, string, string]; // [Z, Symbol, Name, Mass, Category]

const ELEMENTS: ElemTuple[] = [
  [1,'H','Hidrogen','1.008','nonmetal'],[2,'He','Helium','4.0026','noble'],
  [3,'Li','Litium','6.94','alkali'],[4,'Be','Berilium','9.0122','alkaline'],[5,'B','Boron','10.81','metalloid'],[6,'C','Karbon','12.011','nonmetal'],[7,'N','Nitrogen','14.007','nonmetal'],[8,'O','Oksigen','15.999','nonmetal'],[9,'F','Fluorin','18.998','halogen'],[10,'Ne','Neon','20.180','noble'],
  [11,'Na','Natrium','22.990','alkali'],[12,'Mg','Magnesium','24.305','alkaline'],[13,'Al','Aluminium','26.982','post'],[14,'Si','Silikon','28.085','metalloid'],[15,'P','Fosforus','30.974','nonmetal'],[16,'S','Belerang','32.06','nonmetal'],[17,'Cl','Klorin','35.45','halogen'],[18,'Ar','Argon','39.948','noble'],
  [19,'K','Kalium','39.098','alkali'],[20,'Ca','Kalsium','40.078','alkaline'],[21,'Sc','Skandium','44.956','transition'],[22,'Ti','Titanium','47.867','transition'],[23,'V','Vanadium','50.942','transition'],[24,'Cr','Kromium','51.996','transition'],[25,'Mn','Mangan','54.938','transition'],[26,'Fe','Besi','55.845','transition'],[27,'Co','Kobalt','58.933','transition'],[28,'Ni','Nikel','58.693','transition'],[29,'Cu','Tembaga','63.546','transition'],[30,'Zn','Seng','65.38','transition'],[31,'Ga','Galium','69.723','post'],[32,'Ge','Germanium','72.630','metalloid'],[33,'As','Arsen','74.922','metalloid'],[34,'Se','Selenium','78.971','nonmetal'],[35,'Br','Bromin','79.904','halogen'],[36,'Kr','Kripton','83.798','noble'],
  [37,'Rb','Rubidium','85.468','alkali'],[38,'Sr','Stronsium','87.62','alkaline'],[39,'Y','Itrium','88.906','transition'],[40,'Zr','Zirkonium','91.224','transition'],[41,'Nb','Niobium','92.906','transition'],[42,'Mo','Molibdenum','95.95','transition'],[43,'Tc','Teknesium','98','transition'],[44,'Ru','Rutenium','101.07','transition'],[45,'Rh','Rodium','102.91','transition'],[46,'Pd','Paladium','106.42','transition'],[47,'Ag','Perak','107.87','transition'],[48,'Cd','Kadmium','112.41','transition'],[49,'In','Indium','114.82','post'],[50,'Sn','Timah','118.71','post'],[51,'Sb','Antimon','121.76','metalloid'],[52,'Te','Telurium','127.60','metalloid'],[53,'I','Iodin','126.90','halogen'],[54,'Xe','Xenon','131.29','noble'],
  [55,'Cs','Sesium','132.91','alkali'],[56,'Ba','Barium','137.33','alkaline'],[57,'La','Lantanum','138.91','lanthanide'],[58,'Ce','Serium','140.12','lanthanide'],[59,'Pr','Praseodimium','140.91','lanthanide'],[60,'Nd','Neodimium','144.24','lanthanide'],[61,'Pm','Prometium','145','lanthanide'],[62,'Sm','Samarium','150.36','lanthanide'],[63,'Eu','Europium','151.96','lanthanide'],[64,'Gd','Gadolinium','157.25','lanthanide'],[65,'Tb','Terbium','158.93','lanthanide'],[66,'Dy','Disprosium','162.50','lanthanide'],[67,'Ho','Holmium','164.93','lanthanide'],[68,'Er','Erbium','167.26','lanthanide'],[69,'Tm','Tulium','168.93','lanthanide'],[70,'Yb','Iterbium','173.05','lanthanide'],[71,'Lu','Lutesium','174.97','lanthanide'],
  [72,'Hf','Hafnium','178.49','transition'],[73,'Ta','Tantalum','180.95','transition'],[74,'W','Wolfram','183.84','transition'],[75,'Re','Renium','186.21','transition'],[76,'Os','Osmium','190.23','transition'],[77,'Ir','Iridium','192.22','transition'],[78,'Pt','Platina','195.08','transition'],[79,'Au','Emas','196.97','transition'],[80,'Hg','Raksa','200.59','transition'],[81,'Tl','Talium','204.38','post'],[82,'Pb','Timbal','207.2','post'],[83,'Bi','Bismut','208.98','post'],[84,'Po','Polonium','209','metalloid'],[85,'At','Astatin','210','halogen'],[86,'Rn','Radon','222','noble'],
  [87,'Fr','Fransium','223','alkali'],[88,'Ra','Radium','226','alkaline'],[89,'Ac','Aktinium','227','actinide'],[90,'Th','Torium','232.04','actinide'],[91,'Pa','Protaktinium','231.04','actinide'],[92,'U','Uranium','238.03','actinide'],[93,'Np','Neptunium','237','actinide'],[94,'Pu','Plutonium','244','actinide'],[95,'Am','Amerisium','243','actinide'],[96,'Cm','Kurium','247','actinide'],[97,'Bk','Berkelium','247','actinide'],[98,'Cf','Kalifornium','251','actinide'],[99,'Es','Einsteinium','252','actinide'],[100,'Fm','Fermium','257','actinide'],[101,'Md','Mendelevium','258','actinide'],[102,'No','Nobelium','259','actinide'],[103,'Lr','Lawrensium','266','actinide'],
  [104,'Rf','Rutherfordium','267','transition'],[105,'Db','Dubnium','268','transition'],[106,'Sg','Seaborgium','269','transition'],[107,'Bh','Bohrium','270','transition'],[108,'Hs','Hasium','277','transition'],[109,'Mt','Meitnerium','278','transition'],[110,'Ds','Darmstadtium','281','transition'],[111,'Rg','Roentgenium','282','transition'],[112,'Cn','Kopernisium','285','transition'],[113,'Nh','Nihonium','286','post'],[114,'Fl','Flerovium','289','post'],[115,'Mc','Moskovium','290','post'],[116,'Lv','Livermorium','293','post'],[117,'Ts','Tenesin','294','halogen'],[118,'Og','Oganeson','294','noble'],
];

const CAT_COLORS: Record<string, string> = {
  nonmetal: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  noble: 'bg-purple-50 border-purple-300 text-purple-900',
  alkali: 'bg-rose-50 border-rose-300 text-rose-900',
  alkaline: 'bg-amber-50 border-amber-300 text-amber-900',
  metalloid: 'bg-teal-50 border-teal-300 text-teal-900',
  halogen: 'bg-cyan-50 border-cyan-300 text-cyan-900',
  transition: 'bg-blue-50 border-blue-300 text-blue-900',
  post: 'bg-slate-100 border-slate-300 text-slate-900',
  lanthanide: 'bg-pink-50 border-pink-300 text-pink-900',
  actinide: 'bg-orange-50 border-orange-300 text-orange-900',
};

export interface PeriodicTableWidgetProps {
  open: boolean;
  onClose: () => void;
  onOpenBuildAtomLab?: () => void;
}

export const PeriodicTableWidget: React.FC<PeriodicTableWidgetProps> = ({
  open,
  onClose,
  onOpenBuildAtomLab,
}) => {
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [selected, setSelected] = useState<ElemTuple>(ELEMENTS[5]); // Karbon

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ELEMENTS.filter((el) => {
      if (catFilter !== 'all' && el[4] !== catFilter) return false;
      if (q && !el[1].toLowerCase().includes(q) && !el[2].toLowerCase().includes(q) && String(el[0]) !== q) {
        return false;
      }
      return true;
    });
  }, [query, catFilter]);

  if (!open) return null;

  return (
    <div data-testid="periodic-table-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5 backdrop-blur-xs">
      <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">⚛ Tabel Periodik Interaktif (118 Unsur)</h2>
            <p className="text-[11px] text-slate-500">Klik unsur untuk detail atom & langsung uji di Lab Bangun Atom</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari unsur (mis. Au, Oksigen, 6)..."
              className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-indigo-400"
            />
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
              Tutup ×
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-5 py-2 text-[11px]">
          {(['all', 'nonmetal', 'noble', 'alkali', 'alkaline', 'transition', 'metalloid', 'halogen', 'lanthanide', 'actinide'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCatFilter(c)}
              className={`shrink-0 rounded-full px-2.5 py-1 font-semibold capitalize ${catFilter === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {c === 'all' ? 'Semua (118)' : c}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
          {/* Elements Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 sm:grid-cols-9 lg:grid-cols-12 gap-1.5">
              {filtered.map((el) => (
                <button
                  key={el[0]}
                  type="button"
                  onClick={() => setSelected(el)}
                  className={`flex flex-col items-center justify-center rounded-xl border p-1.5 text-center transition hover:scale-105 ${
                    CAT_COLORS[el[4]] ?? 'bg-slate-50 border-slate-200'
                  } ${selected[0] === el[0] ? 'ring-2 ring-indigo-600 shadow-md' : ''}`}
                >
                  <span className="text-[9px] font-mono opacity-70">{el[0]}</span>
                  <span className="text-sm font-black leading-tight">{el[1]}</span>
                  <span className="w-full truncate text-[8px] font-medium opacity-80">{el[2]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Element Inspector Card */}
          <aside className="w-full md:w-72 shrink-0 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50 p-5 flex flex-col justify-between">
            <div>
              <div className={`mb-4 flex h-28 w-28 flex-col items-center justify-center rounded-2xl border-2 mx-auto ${CAT_COLORS[selected[4]] ?? ''}`}>
                <span className="text-xs font-mono font-bold">Z = {selected[0]}</span>
                <span className="text-4xl font-black">{selected[1]}</span>
                <span className="text-[11px] font-semibold">{selected[3]} u</span>
              </div>
              <h3 className="text-center text-lg font-extrabold text-slate-900">{selected[2]}</h3>
              <p className="text-center text-xs capitalize text-slate-500 mb-4">Golongan: {selected[4]}</p>
              <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Nomor Atom (Proton)</span><strong>{selected[0]}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Elektron Netral</span><strong>{selected[0]}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Massa Atom</span><strong>{selected[3]} u</strong></div>
              </div>
            </div>
            {onOpenBuildAtomLab && (
              <button
                type="button"
                onClick={() => { onClose(); onOpenBuildAtomLab(); }}
                className="mt-4 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500"
              >
                ⚛ Buka di Lab Bangun Atom →
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
