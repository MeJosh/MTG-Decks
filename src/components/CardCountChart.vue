<script setup lang="ts">
import * as d3 from 'd3';
import Paginator from 'primevue/paginator';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

interface CardCount {
  name: string;
  quantity: number;
  colorIdentity?: string[];
}

const colorOrder = ['W', 'U', 'B', 'R', 'G'];
const colorFills: Record<string, string> = {
  W: '#eee8c7',
  U: '#8ec5d5',
  B: '#aaa4a1',
  R: '#d58a6d',
  G: '#91c9a1',
  C: '#c4c5bf',
};

const props = defineProps<{ cards: CardCount[] }>();
const chart = ref<HTMLDivElement>();
const first = ref(0);
const pageSize = 20;
const visibleCards = computed(() => props.cards.slice(first.value, first.value + pageSize));
const paginatorTemplate = {
  '640px': 'PrevPageLink CurrentPageReport NextPageLink',
  default: 'FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink',
};
const entryDelay = 75;
const entryDuration = 450;
const valueFadeDuration = 200;
let resizeObserver: ResizeObserver | undefined;
let pendingAnimationStart: number | undefined = 0;
let lastRenderedWidth: number | undefined;
let entryTimer: number | undefined;
const isTransitioning = ref(false);

async function changePage({ first: nextFirst }: { first: number }) {
  if (nextFirst === first.value || isTransitioning.value) return;

  isTransitioning.value = true;
  if (entryTimer !== undefined) window.clearTimeout(entryTimer);
  const currentRows = d3.select(chart.value).selectAll<SVGGElement, CardCount>('svg > g > g');
  currentRows.interrupt();
  currentRows.selectAll('*').interrupt();

  try {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !currentRows.empty()) {
      await Promise.all([
        currentRows.select<SVGRectElement>('rect.bar')
          .transition()
          .delay(valueFadeDuration)
          .duration(entryDuration)
          .ease(d3.easeCubicInOut)
          .attr('width', 0)
          .end(),
        currentRows.selectAll('text.label')
          .transition()
          .duration(entryDuration)
          .ease(d3.easeCubicInOut)
          .attr('opacity', 0)
          .end(),
        currentRows.selectAll('text.value')
          .transition()
          .duration(valueFadeDuration)
          .ease(d3.easeCubicOut)
          .attr('opacity', 0)
          .end(),
      ]);
    }

    first.value = nextFirst;
    pendingAnimationStart = 0;
    renderChart();
  } finally {
    isTransitioning.value = false;
  }
}

function renderChart() {
  const container = chart.value;
  if (!container) return;

  const width = container.clientWidth;
  if (!width) return;
  lastRenderedWidth = width;

  const margin = { top: 12, right: 52, bottom: 12, left: Math.min(260, Math.max(148, width * 0.28)) };
  const rowHeight = 26;
  const height = margin.top + margin.bottom + Math.max(visibleCards.value.length * rowHeight, rowHeight);
  const innerWidth = Math.max(1, width - margin.left - margin.right);
  const maxQuantity = d3.max(props.cards, (card) => card.quantity) ?? 0;
  const x = d3.scaleLinear().domain([0, maxQuantity]).nice().range([0, innerWidth]);
  const y = d3.scaleBand().domain(visibleCards.value.map((card) => card.name)).range([margin.top, height - margin.bottom]).padding(0.22);
  const identity = (card: CardCount) => colorOrder.filter((color) => card.colorIdentity?.includes(color));
  const identityKey = (card: CardCount) => identity(card).join('') || 'C';
  const barFill = (card: CardCount) => {
    const key = identityKey(card);
    return key.length > 1 ? `url(#card-identity-${key})` : colorFills[key]!;
  };

  d3.select(container).selectAll('svg').remove();
  const svg = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Card quantities across all decks, sorted from highest to lowest.');

  const multiColorIdentities = [...new Set(visibleCards.value.map(identityKey).filter((key) => key.length > 1))];
  const gradients = svg.append('defs').selectAll('linearGradient')
    .data(multiColorIdentities)
    .join('linearGradient')
    .attr('id', (key) => `card-identity-${key}`)
    .attr('x1', '0%')
    .attr('x2', '100%');
  gradients.selectAll('stop')
    .data((key) => [...key])
    .join('stop')
    .attr('offset', (_color, index, colors) => `${(index / (colors.length - 1)) * 100}%`)
    .attr('stop-color', (color) => colorFills[color]!);

  const rows = svg.append('g').attr('transform', `translate(${margin.left},0)`)
    .selectAll<SVGGElement, CardCount>('g')
    .data(visibleCards.value)
    .join('g')
    .attr('transform', (card) => `translate(0,${y(card.name) ?? 0})`);

  rows.append('rect')
    .attr('class', 'bar')
    .attr('fill', barFill)
    .attr('width', (card) => x(card.quantity))
    .attr('height', y.bandwidth())
    .append('title')
    .text((card) => `${card.name}: ${card.quantity}`);

  rows.append('text')
    .attr('class', 'label')
    .attr('x', -12)
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', 'end')
    .text((card) => card.name);

  rows.append('text')
    .attr('class', 'value')
    .attr('x', (card) => x(card.quantity) + 7)
    .attr('y', y.bandwidth() / 2)
    .attr('dy', '0.35em')
    .text((card) => card.quantity);

  const animationStart = pendingAnimationStart;
  pendingAnimationStart = undefined;
  if (animationStart !== undefined && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const enteringRows = rows.filter((_card, index) => index >= animationStart);
    enteringRows.select<SVGRectElement>('rect.bar').attr('width', 0);
    enteringRows.selectAll('text').attr('opacity', 0);

    entryTimer = window.setTimeout(() => {
      enteringRows.select<SVGRectElement>('rect.bar')
        .transition()
        .duration(entryDuration)
        .ease(d3.easeCubicInOut)
        .attr('width', (card) => x(card.quantity));
      enteringRows.selectAll('text.label')
        .transition()
        .duration(entryDuration)
        .ease(d3.easeCubicInOut)
        .attr('opacity', 1);
      enteringRows.selectAll('text.value')
        .transition()
        .duration(valueFadeDuration)
        .ease(d3.easeCubicOut)
        .attr('opacity', 1);
    }, entryDelay);
  }
}

function handleResize() {
  if (chart.value?.clientWidth !== lastRenderedWidth) renderChart();
}

onMounted(() => {
  renderChart();
  resizeObserver = new ResizeObserver(handleResize);
  if (chart.value) resizeObserver.observe(chart.value);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  if (entryTimer !== undefined) window.clearTimeout(entryTimer);
});
watch(() => props.cards, () => {
  first.value = 0;
  pendingAnimationStart = 0;
  renderChart();
}, { deep: true });
</script>

<template>
  <div class="card-count-chart">
    <div ref="chart" />
    <Paginator
      v-if="cards.length > pageSize"
      class="card-count-paginator"
      :first="first"
      :rows="pageSize"
      :total-records="cards.length"
      :template="paginatorTemplate"
      current-page-report-template="{currentPage} / {totalPages}"
      :disabled="isTransitioning"
      @page="changePage"
    />
  </div>
</template>

<style scoped>
.card-count-chart { width: 100%; overflow: hidden; }
.card-count-chart > div:first-child :deep(svg) { display: block; width: 100%; height: auto; overflow: visible; }
.card-count-chart :deep(.label) { fill: var(--soft); font-size: .78rem; }
.card-count-chart :deep(.value) { fill: var(--muted); font-size: .72rem; font-variant-numeric: tabular-nums; }
.card-count-paginator { justify-content: center; padding-top: 1rem; }
</style>
