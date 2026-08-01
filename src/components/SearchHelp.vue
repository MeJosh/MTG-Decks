<script setup lang="ts">
import QuestionCircle from '@primeicons/vue/question-circle';
import Popover from 'primevue/popover';
import { ref } from 'vue';

const popover = ref<InstanceType<typeof Popover>>();

function togglePopover(event: Event) {
  popover.value?.toggle(event);
}
</script>

<template>
  <button
    class="search-help-trigger"
    type="button"
    aria-label="Search help"
    title="Search help"
    @click="togglePopover"
  >
    <QuestionCircle :size="16" aria-hidden="true" />
  </button>
  <Popover
    ref="popover"
    aria-label="Search help"
    :pt="{ root: { class: 'search-help-popover' } }"
  >
    <div class="search-help-content">
      <p class="search-help-heading">Search decks</p>
      <p class="search-help-description">Plain text searches titles, slugs, cards, formats, and tags.</p>
      <dl class="search-help-commands">
        <div><dt><code>deck: / d:</code></dt><dd>Deck title</dd></div>
        <div><dt><code>slug: / s:</code></dt><dd>Deck slug</dd></div>
        <div><dt><code>card: / c:</code></dt><dd>Any deck or sideboard card</dd></div>
        <div><dt><code>color: / cl:</code></dt><dd>Color name or mana letter</dd></div>
        <div><dt><code>, / +</code></dt><dd>Joins multiple terms</dd></div>
      </dl>
    </div>
  </Popover>
</template>

<style scoped>
.search-help-trigger {
  display: grid;
  width: 1.35rem;
  height: 2.35rem;
  flex: none;
  padding: 0;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.search-help-trigger:hover {
  color: var(--accent);
}

.search-help-trigger:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: .16rem;
}
</style>

<style>
.search-help-popover {
  max-width: min(22rem, calc(100vw - 2rem));
}

.search-help-content {
  padding: .1rem;
}

.search-help-heading {
  margin: 0 0 .3rem;
  color: var(--ink);
  font-size: .82rem;
  font-weight: 750;
}

.search-help-description {
  margin: 0;
  color: var(--muted);
  font-size: .75rem;
  line-height: 1.45;
}

.search-help-commands {
  display: grid;
  gap: .4rem;
  margin: .9rem 0;
}

.search-help-commands div {
  display: grid;
  grid-template-columns: 7.2rem 1fr;
  gap: .5rem;
  align-items: baseline;
}

.search-help-commands dt,
.search-help-commands dd {
  margin: 0;
}

.search-help-commands dd {
  color: var(--soft);
  font-size: .75rem;
}

.search-help-content code {
  color: var(--accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .72rem;
}
</style>
