import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

/**
 * Waterfall Chart — shows cumulative cash flow breakdown
 */
export default function WaterfallChart({ data, title, note }) {
  const ref = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!data || !data.length) return;
    const svg = d3.select(ref.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 50, left: 60 };
    const width = ref.current.parentElement.clientWidth || 500;
    const height = 280;
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, innerW]).padding(0.3);
    const maxVal = d3.max(data, d => Math.max(d.cashIn || 0, d.netCash || 0, d.cashOut || 0)) || 1;
    const y = d3.scaleLinear().domain([0, maxVal * 1.15]).range([innerH, 0]);

    const tooltip = d3.select(tooltipRef.current);

    // Bars
    data.forEach((d, i) => {
      const isIncome = d.cashIn >= 0;
      const value = d.cashIn || d.netCash || 0;
      const barHeight = innerH - y(value);
      
      g.append('rect')
        .attr('class', 'waterfall-bar')
        .attr('x', x(d.label))
        .attr('y', y(value))
        .attr('width', x.bandwidth())
        .attr('height', barHeight)
        .attr('fill', isIncome ? '#10b981' : '#e11d48')
        .attr('rx', 3)
        .on('mouseenter', (event) => {
          tooltip
            .style('display', 'block')
            .style('left', `${event.offsetX + 10}px`)
            .style('top', `${event.offsetY - 20}px`)
            .html(`<strong>${d.label}</strong><br/>Cash In: Rp ${(d.cashIn || 0).toLocaleString()}<br/>Net: Rp ${(d.netCash || 0).toLocaleString()}`);
        })
        .on('mousemove', (event) => {
          tooltip.style('left', `${event.offsetX + 10}px`).style('top', `${event.offsetY - 20}px`);
        })
        .on('mouseleave', () => tooltip.style('display', 'none'));
    });

    // Axes
    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d => `Rp${(d/1000000).toFixed(0)}jt`))
      .selectAll('text').attr('font-size', '9px').attr('fill', '#94a3b8');
    g.selectAll('.domain').attr('stroke', '#e2e8f0');
    g.selectAll('.tick line').attr('stroke', '#e2e8f0');

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickSize(0))
      .selectAll('text')
      .attr('transform', 'rotate(-25)')
      .attr('text-anchor', 'end')
      .attr('font-size', '8px')
      .attr('fill', '#94a3b8');
    g.selectAll('.domain').attr('stroke', '#e2e8f0');

  }, [data]);

  if (!data || !data.length) return null;

  return (
    <div className="panel">
      <div className="panel-head">
        <div><h3>{title || 'Cash Flow Waterfall'}</h3><p>{note || 'Monthly breakdown'}</p></div>
      </div>
      <div className="d3-chart" style={{ padding: '0.5rem 0' }}>
        <svg ref={ref} width="100%" height="300"></svg>
        <div ref={tooltipRef} className="d3-tooltip" style={{ display: 'none' }}></div>
      </div>
    </div>
  );
}
