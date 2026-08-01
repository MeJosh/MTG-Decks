<script setup lang="ts">
import AutoComplete from 'primevue/autocomplete';
import Chip from 'primevue/chip';
import { storeToRefs } from 'pinia';
import { nextTick, ref } from 'vue';

import { useSettingsStore } from '../stores/settings';

interface DeckOption {
  title: string;
  slug: string;
}

type SuggestionKind = 'deck' | 'card' | 'slug' | 'color';

interface Suggestion {
  kind: SuggestionKind;
  label: string;
}

const props = defineProps<{
  decks: DeckOption[];
  cards: string[];
}>();

const value = ref<string | Suggestion>('');
const suggestions = ref<Suggestion[]>([]);
const root = ref<HTMLElement>();
const autocomplete = ref<InstanceType<typeof AutoComplete>>();
const settingsStore = useSettingsStore();
const { autocompleteEnabled } = storeToRefs(settingsStore);

const PREFIX_PATTERN = /^(deck|d|slug|s|card|c|color|cl):([^\s,|+]*)$/i;
const colors = ['White', 'Blue', 'Black', 'Red', 'Green'];

function matches(value: string, query: string) {
  return value.toLocaleLowerCase('en-US').includes(query.toLocaleLowerCase('en-US'));
}

function toSuggestions(values: string[], kind: SuggestionKind, prefix = '') {
  return values.map((option) => ({ kind, label: `${prefix}${option}` }));
}

function complete({ query }: { query: string }) {
  if (/[,|+]/.test(query)) {
    suggestions.value = [];
    autocomplete.value?.hide();
    return;
  }

  const prefixMatch = PREFIX_PATTERN.exec(query);
  if (prefixMatch) {
    const [, scopedPrefix, term = ''] = prefixMatch;
    const normalizedPrefix = scopedPrefix!.toLocaleLowerCase('en-US');
    const [kind, scopedValues]: [SuggestionKind, string[]] = normalizedPrefix === 'deck' || normalizedPrefix === 'd'
      ? ['deck', props.decks.map(({ title }) => title)]
      : normalizedPrefix === 'slug' || normalizedPrefix === 's'
        ? ['slug', props.decks.map(({ slug }) => slug)]
        : normalizedPrefix === 'card' || normalizedPrefix === 'c'
          ? ['card', props.cards]
          : ['color', colors];
    suggestions.value = toSuggestions(
      scopedValues.filter((option) => matches(option, term)),
      kind,
    );
    return;
  }

  const matchingDecks = props.decks.filter(({ title }) => matches(title, query));
  const matchingDeckSlugs = new Set(matchingDecks.map(({ slug }) => slug));
  suggestions.value = [
    ...toSuggestions(matchingDecks.map(({ title }) => title), 'deck'),
    ...toSuggestions(props.cards.filter((card) => matches(card, query)), 'card'),
    ...toSuggestions(
      props.decks
        .filter(({ slug }) => matches(slug, query) && !matchingDeckSlugs.has(slug))
        .map(({ slug }) => slug),
      'slug',
    ),
  ];
}

async function syncFilter() {
  await nextTick();
  root.value?.querySelector<HTMLInputElement>('[data-deck-search]')?.dispatchEvent(
    new Event('input', { bubbles: true }),
  );
}

async function commitFilter(event: KeyboardEvent) {
  if (event.isComposing) return;
  await syncFilter();
  window.setTimeout(() => {
    autocomplete.value?.hide();
    root.value?.querySelector<HTMLInputElement>('[data-deck-search]')?.blur();
  });
}

function commitTypedFilter(event: KeyboardEvent) {
  if (event.isComposing || event.defaultPrevented) return;
  autocomplete.value?.hide();
  void commitFilter(event);
}

function selectSuggestion() {
  void syncFilter().then(() => window.setTimeout(() => {
    autocomplete.value?.hide();
    root.value?.querySelector<HTMLInputElement>('[data-deck-search]')?.blur();
  }));
}

</script>

<template>
  <span ref="root" class="deck-autocomplete">
    <input
      v-if="!autocompleteEnabled"
      type="search"
      placeholder="Search decks"
      autocomplete="off"
      title="Use deck: / d:, slug: / s:, card: / c:, or color: / cl:; use , or + for AND and | for OR"
      data-deck-search
    />
    <AutoComplete
      v-else
      ref="autocomplete"
      v-model="value"
      :suggestions="suggestions"
      option-label="label"
      placeholder="Search decks"
      aria-label="Search decks"
      :delay="0"
      :min-length="1"
      panel-class="deck-autocomplete-panel"
      :panel-style="{ marginTop: '.5rem' }"
      :pt="{
        pcInputText: { root: { 'data-deck-search': '' } },
        transition: { name: 'deck-autocomplete-overlay' },
      }"
      @complete="complete"
      @option-select="selectSuggestion"
      @keydown.enter="commitTypedFilter"
    >
      <template #option="{ option }">
        <div class="deck-autocomplete-option">
          <Chip
            :label="option.kind"
            :class="['deck-autocomplete-chip', `deck-autocomplete-chip--${option.kind}`]"
          />
          <span>{{ option.label }}</span>
        </div>
      </template>
    </AutoComplete>
  </span>
</template>

<style>
.deck-autocomplete-option {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: .4rem;
  font-size: .88rem;
  line-height: 1.2;
}

.deck-autocomplete-panel .p-autocomplete-list {
  padding: .2rem;
}

.deck-autocomplete-panel {
  translate: 0 .75rem;
}

.deck-autocomplete-panel .p-autocomplete-option {
  padding: .35rem .45rem;
}

.deck-autocomplete-overlay-enter-active,
.deck-autocomplete-overlay-leave-active {
  transition: opacity .12s ease;
}

.deck-autocomplete-overlay-enter-from,
.deck-autocomplete-overlay-leave-to {
  opacity: 0;
}

.deck-autocomplete-chip {
  flex: none;
  padding: .08rem .3rem;
  color: #171917;
  font-size: .58rem;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
}

.deck-autocomplete-chip--deck { background: #8ec5d5 !important; }
.deck-autocomplete-chip--card { background: #d58a6d !important; }
.deck-autocomplete-chip--color { background: #eee8c7 !important; }
.deck-autocomplete-chip--slug { background: #aaa4a1 !important; }

.deck-autocomplete-chip .p-chip-label {
  margin: 0;
  color: #171917 !important;
  line-height: 1.2;
}
</style>
