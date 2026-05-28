import type { Article } from "../types";
import * as yakNavchytysia from "./yak-navchytysia-hraty-z-nulia";
import * as yakuHitaruVybraty from "./yaku-hitaru-vybraty";
import * as budovaHitary from "./budova-hitary";
import * as shchoTakeAkordy from "./shcho-take-akordy";
import * as yakChytatyAkordy from "./yak-chytaty-akordy";
import * as shchoTakeBare from "./shcho-take-bare";
import * as pershiAkordy from "./pershi-akordy";
import * as yakNalashtuvatyHitaru from "./yak-nalashtuvaty-hitaru";
import * as shchoTakeKapo from "./shcho-take-kapo";
import * as biyNaHitari from "./biy-na-hitari";
import * as perebirNaHitari from "./perebir-na-hitari";
import * as yakTransponuvatyAkordy from "./yak-transponuvaty-akordy";

const modules = [
  yakNavchytysia,
  yakuHitaruVybraty,
  budovaHitary,
  shchoTakeAkordy,
  yakChytatyAkordy,
  shchoTakeBare,
  pershiAkordy,
  yakNalashtuvatyHitaru,
  shchoTakeKapo,
  biyNaHitari,
  perebirNaHitari,
  yakTransponuvatyAkordy,
];

export const ARTICLES: Article[] = modules
  .map((m) => ({ meta: m.meta, Body: m.Body }))
  .sort((a, b) => a.meta.order - b.meta.order);

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.meta.slug === slug);
}

export function getArticleSlugs(): string[] {
  return ARTICLES.map((a) => a.meta.slug);
}
