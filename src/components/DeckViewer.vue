<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';

import type { DeckGroup } from '../lib/deck/grouping';
import type { ResolvedDeckEntry } from '../lib/deck/resolver';
import { usePreviewStore } from '../stores/preview';

const props = defineProps<{
  groups: DeckGroup[];
  sideboard: ResolvedDeckEntry[];
  commanders: ResolvedDeckEntry[];
  companion: ResolvedDeckEntry[];
  deckCount: number;
  sideboardCount: number;
}>();

const previewStore = usePreviewStore();
const initialEntry = props.groups[0]?.entries[0] ?? props.commanders[0] ?? props.companion[0] ?? props.sideboard[0];

const supplementalSections = computed(() => [
  {
    key: 'commander',
    label: props.commanders.length === 1 ? 'Commander' : 'Commanders',
    entries: props.commanders,
    count: props.commanders.reduce((total, entry) => total + entry.quantity, 0),
  },
  {
    key: 'companion',
    label: 'Companion',
    entries: props.companion,
    count: props.companion.reduce((total, entry) => total + entry.quantity, 0),
  },
  {
    key: 'sideboard',
    label: 'Sideboard',
    entries: props.sideboard,
    count: props.sideboardCount,
  },
].filter((section) => section.entries.length > 0));

if (initialEntry) previewStore.preview(initialEntry.card);

function isTouchPreview(): boolean {
  return window.matchMedia('(hover: none), (pointer: coarse)').matches;
}

function handleCardClick(event: MouseEvent, entry: ResolvedDeckEntry) {
  if (!isTouchPreview()) return;
  event.preventDefault();
  previewStore.openDialog(entry.card);
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') previewStore.closeDialog();
}

function manaSymbols(manaCost: string): string[] {
  return [...displayedManaCost(manaCost).matchAll(/\{([^}]+)\}/g)].map((match) => match[1]!);
}

function displayedManaCost(manaCost: string): string {
  return manaCost.split(' // ')[0] ?? manaCost;
}

function manaSymbolUrl(symbol: string): string {
  const fileName = encodeURIComponent(symbol.replaceAll('/', '-'));
  return `https://svgs.scryfall.io/card-symbols/${fileName}.svg`;
}

onMounted(() => window.addEventListener('keydown', handleEscape));
onUnmounted(() => window.removeEventListener('keydown', handleEscape));
</script>

<template>
  <div class="deck-shell">
    <div class="deck-columns">
      <section aria-labelledby="deck-heading">
        <div class="section-heading">
          <h2 id="deck-heading">Deck</h2>
          <span>{{ deckCount }}</span>
        </div>

        <div class="groups-grid">
          <section v-for="group in groups" :key="group.label" class="card-group">
            <h3>
              <span>{{ group.label }}</span>
              <span class="group-count">{{ group.count }}</span>
            </h3>
            <ul>
              <li
                v-for="entry in group.entries"
                :key="`${entry.card.id}-${entry.line}`"
                :data-card-row="entry.card.id"
                @pointerenter="previewStore.preview(entry.card)"
              >
                <span class="quantity">{{ entry.quantity }}</span>
                <a
                  :href="entry.card.scryfallUri"
                  :data-card-id="entry.card.id"
                  target="_blank"
                  rel="noreferrer"
                  @focus="previewStore.preview(entry.card)"
                  @click="handleCardClick($event, entry)"
                >{{ entry.name }}</a>
                <span
                  v-if="entry.card.manaCost"
                  class="mana-cost"
                  :data-mana-for="entry.card.id"
                  :aria-label="`Mana cost ${displayedManaCost(entry.card.manaCost)}`"
                >
                  <img
                    v-for="(symbol, symbolIndex) in manaSymbols(entry.card.manaCost)"
                    :key="`${symbol}-${symbolIndex}`"
                    class="mana-symbol"
                    :src="manaSymbolUrl(symbol)"
                    :alt="`{${symbol}}`"
                    width="18"
                    height="18"
                  />
                </span>
                <span
                  v-if="entry.warning"
                  class="warning"
                  :title="entry.warning"
                  :aria-label="entry.warning"
                >!</span>
              </li>
            </ul>
          </section>
        </div>
      </section>

      <aside v-if="supplementalSections.length" class="supplemental">
        <section
          v-for="section in supplementalSections"
          :key="section.key"
          :aria-labelledby="`${section.key}-heading`"
          class="supplemental-section"
        >
          <div class="section-heading">
            <h2 :id="`${section.key}-heading`">{{ section.label }}</h2>
            <span>{{ section.count }}</span>
          </div>
          <ul class="supplemental-list">
            <li
              v-for="entry in section.entries"
              :key="`${section.key}-${entry.card.id}-${entry.line}`"
              :data-card-row="entry.card.id"
              @pointerenter="previewStore.preview(entry.card)"
            >
              <span class="quantity">{{ entry.quantity }}</span>
              <a
                :href="entry.card.scryfallUri"
                :data-card-id="entry.card.id"
                target="_blank"
                rel="noreferrer"
                @focus="previewStore.preview(entry.card)"
                @click="handleCardClick($event, entry)"
              >{{ entry.name }}</a>
              <span
                v-if="entry.card.manaCost"
                class="mana-cost"
                :data-mana-for="entry.card.id"
                :aria-label="`Mana cost ${displayedManaCost(entry.card.manaCost)}`"
              >
                <img
                  v-for="(symbol, symbolIndex) in manaSymbols(entry.card.manaCost)"
                  :key="`${symbol}-${symbolIndex}`"
                  class="mana-symbol"
                  :src="manaSymbolUrl(symbol)"
                  :alt="`{${symbol}}`"
                  width="18"
                  height="18"
                />
              </span>
              <span
                v-if="entry.warning"
                class="warning"
                :title="entry.warning"
                :aria-label="entry.warning"
              >!</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>

    <aside v-if="previewStore.current" class="preview-rail" aria-live="polite">
      <div class="preview-sticky">
        <p class="eyebrow">Card preview</p>
        <a :href="previewStore.current.scryfallUri" target="_blank" rel="noreferrer">
          <img
            data-preview-image
            :src="previewStore.current.image"
            :alt="`${previewStore.current.name} card`"
            width="488"
            height="680"
          />
        </a>
        <div class="printing-caption">
          <span>{{ previewStore.current.setName }}</span>
          <span>{{ previewStore.current.set }} · {{ previewStore.current.collectorNumber }}</span>
        </div>
      </div>
    </aside>

    <div
      v-if="previewStore.dialogOpen && previewStore.current"
      class="dialog-backdrop"
      role="dialog"
      aria-modal="true"
      :aria-label="`${previewStore.current.name} preview`"
      @click.self="previewStore.closeDialog()"
    >
      <div class="dialog-card">
        <button type="button" aria-label="Close preview" @click="previewStore.closeDialog()">×</button>
        <img
          :src="previewStore.current.image"
          :alt="`${previewStore.current.name} card`"
          width="488"
          height="680"
        />
        <div>
          <strong>{{ previewStore.current.name }}</strong>
          <a :href="previewStore.current.scryfallUri" target="_blank" rel="noreferrer">View on Scryfall ↗</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-shell { display: grid; grid-template-columns: minmax(0, 1fr); gap: 3rem; }
.deck-columns { display: grid; grid-template-columns: minmax(0, 1fr); gap: 3rem; }
.section-heading { display: flex; align-items: baseline; gap: .65rem; padding-bottom: .85rem; border-bottom: 1px solid var(--line); }
.section-heading h2 { font-size: 1.2rem; font-weight: 650; letter-spacing: -.02em; }
.section-heading > span, .group-count { color: var(--muted); font-variant-numeric: tabular-nums; }
.groups-grid { columns: 1; column-gap: 2.5rem; }
.card-group { break-inside: avoid; padding-top: 1.8rem; }
.card-group h3 { display: flex; gap: .45rem; margin-bottom: .6rem; color: var(--soft); font-size: .72rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
ul { list-style: none; padding: 0; margin: 0; }
li { display: grid; grid-template-columns: 1.7rem minmax(0, 1fr) auto auto; align-items: center; width: 100%; max-width: 100%; padding: .2rem 0; line-height: 1.45; }
.quantity { color: var(--muted); font-variant-numeric: tabular-nums; }
li a { color: var(--ink); text-decoration: none; text-underline-offset: .2em; }
li a:hover, li a:focus-visible { color: var(--accent); text-decoration: underline; outline: none; }
.mana-cost { display: inline-flex; align-items: center; justify-content: end; gap: .12rem; min-width: 1rem; margin-left: .65rem; }
.mana-symbol { display: block; width: 1rem; height: 1rem; filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .5)); }
.warning { display: inline-grid; place-items: center; width: .9rem; height: .9rem; margin-left: .35rem; border-radius: 999px; background: var(--warning); color: #19150b; font-size: .65rem; font-weight: 900; cursor: help; }
.supplemental { display: grid; align-content: start; gap: 2.5rem; }
.supplemental-list { padding-top: 1.55rem; }
.preview-rail { display: none; }
.eyebrow { margin: 0 0 .7rem; color: var(--muted); font-size: .7rem; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; }
.preview-sticky img { display: block; width: 100%; border-radius: 4.5% / 3.2%; box-shadow: 0 1.5rem 4rem rgba(0,0,0,.28); background: #111; }
.printing-caption { display: flex; justify-content: space-between; gap: 1rem; padding-top: .8rem; color: var(--muted); font-size: .74rem; }
.printing-caption span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dialog-backdrop { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 1rem; background: rgba(8, 10, 10, .88); backdrop-filter: blur(8px); }
.dialog-card { position: relative; width: min(86vw, 24rem); }
.dialog-card > button { position: absolute; top: -.75rem; right: -.75rem; z-index: 1; display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--ink); font-size: 1.35rem; }
.dialog-card img { display: block; width: 100%; border-radius: 4.5% / 3.2%; }
.dialog-card > div { display: flex; justify-content: space-between; gap: 1rem; padding-top: .8rem; font-size: .8rem; }
.dialog-card a { color: var(--accent); }
@media (min-width: 48rem) {
  .deck-columns { grid-template-columns: minmax(0, 1.5fr) minmax(14rem, .75fr); }
  .groups-grid { columns: 2; }
}
@media (min-width: 64rem) {
  .deck-shell { grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem); }
  .preview-rail { display: block; }
  .preview-sticky { position: sticky; top: 2rem; }
}
</style>
