'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INDUSTRIES = [
  { n: 'Technology', rev: '$16.2B', g: '+12.4%', countries: 48, share: '6.8%', d: 'Enterprise software, cloud, AI/ML, SaaS, cybersecurity.', ic: 'memory', color: '#A100FF' },
  { n: 'Financial Services', rev: '$14.8B', g: '+8.2%', countries: 45, share: '5.4%', d: 'Banking, insurance, capital markets, payments, fintech.', ic: 'account_balance', color: '#7c3aed' },
  { n: 'Energy & Resources', rev: '$8.4B', g: '+6.8%', countries: 38, share: '4.2%', d: 'Oil & gas, mining, renewables, grid modernization.', ic: 'bolt', color: '#2563eb' },
  { n: 'Public Services', rev: '$7.6B', g: '+14.6%', countries: 32, share: '8.1%', d: 'Government, defense, civic technology, public health.', ic: 'shield', color: '#059669' },
  { n: 'Health & Life Sciences', rev: '$6.2B', g: '+18.4%', countries: 35, share: '3.8%', d: 'Pharma, biotech, medical devices, healthcare IT.', ic: 'favorite', color: '#0891b2' },
  { n: 'Communications & Media', rev: '$5.8B', g: '+5.2%', countries: 40, share: '4.5%', d: 'Telecom, broadcasting, streaming, adtech.', ic: 'cell_tower', color: '#d97706' },
  { n: 'Retail & Consumer', rev: '$5.4B', g: '+9.8%', countries: 42, share: '3.6%', d: 'E-commerce, CPG, supply chain, omnichannel.', ic: 'shopping_cart', color: '#e11d48' },
  { n: 'Security', rev: '$4.2B', g: '+24.2%', countries: 44, share: '7.2%', d: 'Cyber defense, managed security, identity, compliance.', ic: 'security', color: '#dc2626' },
];

export default function IndustriesPage() {
  const router = useRouter();
  useEffect(() => {
    const obs = new IntersectionObserver(e => e.forEach(x => { if (x.isIntersecting) x.target.classList.add('v'); }), { threshold: 0.08 });
    setTimeout(() => document.querySelectorAll('.fu').forEach(el => obs.observe(el)), 60);
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', fontFamily: "'Inter',system-ui,sans-serif", color: '#fff' }}>
      <header className="bar" style={{ position: 'sticky', top: 0, zIndex: 40 }}>
        <div className="bar-l">
          <span style={{ fontSize: 14, fontWeight: 900, letterSpacing: '-.02em', cursor: 'pointer' }} onClick={() => router.push('/')}>accenture</span>
          <div style={{ width: 1, height: 14, background: 'var(--s3)', margin: '0 6px' }} />
          <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--t2)' }}>Compass</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--p)', marginLeft: 12 }}>Industry Lens</span>
        </div>
        <div className="bar-r">
          <button className="cta-g" style={{ fontSize: 10, padding: '7px 16px' }} onClick={() => router.push('/')}>World Map</button>
          <button className="cta-g" style={{ fontSize: 10, padding: '7px 16px' }} onClick={() => router.push('/explore/canada')}>Canada</button>
        </div>
      </header>

      <div className="sec">
        <div className="fu sec-head">
          <div className="tag">Industry Lens Intelligence</div>
          <div className="h2" style={{ marginTop: 4, fontSize: 36 }}>Global Industries</div>
          <p className="sub" style={{ marginTop: 4 }}>8 sectors. 48 countries. Select an industry to explore.</p>
        </div>

        {INDUSTRIES.map((ind, i) => (
          <div className="fu cl-row" key={ind.n} style={{ transitionDelay: `${i * .05}s`, borderBottom: '1px solid var(--s2)', padding: '20px 0', cursor: 'pointer' }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${ind.color}15`, border: `1px solid ${ind.color}25`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <span className="ms" style={{ fontSize: 20, color: ind.color }}>{ind.ic}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-.01em' }}>{ind.n}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{ind.d}</div>
              <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)' }}>{ind.countries} countries</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--t4)' }}>{ind.share} market share</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>{ind.rev}</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: parseFloat(ind.g) > 15 ? 'var(--em)' : 'var(--t2)', marginTop: 2 }}>{ind.g}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
