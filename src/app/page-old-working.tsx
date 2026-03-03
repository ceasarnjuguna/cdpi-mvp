"use client";

import { useState } from "react";
import { ReactFlow, Background, Controls, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { VerifyResponse } from '@/lib/types';

export default function Page() {
  const [ciscoConfig, setCiscoConfig] = useState("");
  const [awsSgJson, setAwsSgJson] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"conflicts" | "graph" | "fixes">("conflicts");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciscoConfig, awsSgJson }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Verification failed');
      setResult(data as VerifyResponse);
      setActiveTab('conflicts');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadDemo = async (n: 1 | 2 | 3) => {
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/demo/${n}`);
      const demo = await res.json();
      setCiscoConfig(demo.ciscoConfig);
      setAwsSgJson(demo.awsSgJson);
    } catch {
      setError('Failed to load demo scenario');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-6 py-4">
        <h1 className="text-2xl font-bold text-blue-400">CDPI-MVP</h1>
        <p className="text-sm text-slate-400">Cross-Domain Policy Inspector</p>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="flex flex-1 gap-6 overflow-hidden p-6">
        {/* Left Column — Inputs */}
        <section className="w-[45%] shrink-0 space-y-4 overflow-y-auto pr-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 text-lg font-semibold text-slate-200">Configuration Inputs</h2>
            
            {/* Demo Buttons */}
            <div className="mb-4 flex gap-2">
              <button
                onClick={() => handleLoadDemo(1)}
                className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
              >
                Demo 1
              </button>
              <button
                onClick={() => handleLoadDemo(2)}
                className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
              >
                Demo 2
              </button>
              <button
                onClick={() => handleLoadDemo(3)}
                className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
              >
                Demo 3
              </button>
            </div>

            {/* Cisco Config */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Cisco IOS ACL Configuration
              </label>
              <textarea
                value={ciscoConfig}
                onChange={(e) => setCiscoConfig(e.target.value)}
                className="h-48 w-full rounded border border-slate-700 bg-slate-950 p-3 font-mono text-sm text-slate-100"
                placeholder="ip access-list extended CORP-INBOUND&#10; permit tcp 10.0.1.0 0.0.0.255 any eq 443"
              />
            </div>

            {/* AWS SG JSON */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                AWS Security Group JSON
              </label>
              <textarea
                value={awsSgJson}
                onChange={(e) => setAwsSgJson(e.target.value)}
                className="h-48 w-full rounded border border-slate-700 bg-slate-950 p-3 font-mono text-sm text-slate-100"
                placeholder='{"GroupId":"sg-001","IpPermissions":[...]}'
              />
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={isLoading || !ciscoConfig || !awsSgJson}
              className="w-full rounded bg-green-600 px-4 py-2 font-semibold hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500"
            >
              {isLoading ? 'Verifying...' : 'Verify Policies'}
            </button>
          </div>
        </section>

        {/* Right Column — Results */}
        <section className="flex flex-1 flex-col overflow-y-auto pl-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 text-lg font-semibold text-slate-200">Verification Results</h2>

            {/* Tabs */}
            <div className="mb-4 flex gap-2 border-b border-slate-800">
              <button
                onClick={() => setActiveTab('conflicts')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'conflicts'
                    ? 'border-b-2 border-blue-400 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Conflicts {result && `(${result.conflicts.length})`}
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'graph'
                    ? 'border-b-2 border-blue-400 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Policy Graph
              </button>
              <button
                onClick={() => setActiveTab('fixes')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'fixes'
                    ? 'border-b-2 border-blue-400 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Fixes {result && `(${result.fixes.length})`}
              </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-4">
              {/* Conflicts Tab */}
              {activeTab === 'conflicts' && (
                <div>
                  {result && result.conflicts.length > 0 ? (
                    result.conflicts.map((conflict, i) => (
                      <div
                        key={conflict.id}
                        className="mb-3 rounded border border-slate-700 bg-slate-950 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span
                            className={`rounded px-2 py-1 text-xs font-semibold ${
                              conflict.severity === 'CRITICAL'
                                ? 'bg-red-500/20 text-red-400'
                                : conflict.severity === 'HIGH'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}
                          >
                            {conflict.severity}
                          </span>
                          <span className="text-xs text-slate-500">{conflict.type}</span>
                        </div>
                        <p className="text-sm text-slate-300">{conflict.description}</p>
                        <div className="mt-2 text-xs text-slate-500">
                          Affected: {conflict.affectedCidr.address}/{conflict.affectedCidr.prefix} | Port: {conflict.affectedPort.from}
                          {conflict.affectedPort.from !== conflict.affectedPort.to && `-${conflict.affectedPort.to}`}
                        </div>
                      </div>
                    ))
                  ) : result ? (
                    <div className="text-center text-slate-500">No conflicts detected ✓</div>
                  ) : (
                    <div className="text-center text-slate-500">
                      Load a scenario and click Verify to see conflicts
                    </div>
                  )}
                </div>
              )}

              {/* Policy Graph Tab */}
              {activeTab === 'graph' && (
                <div>
                  {result ? (
                    <div style={{ height: '500px', background: '#0f172a' }}>
                      <ReactFlow
                        nodes={result.graph.nodes.map((n, i) => ({
                          id: n.id,
                          data: { label: n.label ?? n.id },
                          position: { x: n.domain === 'cisco' ? 80 : 520, y: i * 100 },
                          style: {
                            background: n.domain === 'cisco' ? '#1e3a5f' : '#c2410c',
                            color: 'white',
                            border: '1px solid #475569',
                            borderRadius: '6px',
                            fontSize: '12px',
                            padding: '8px 12px',
                          },
                        }))}
                        edges={result.graph.edges.map((e) => ({
                          id: e.id,
                          source: e.src,
                          target: e.dst,
                          animated: !!e.conflict,
                          style: {
                            stroke:
                              e.conflict?.severity === 'CRITICAL'
                                ? '#ef4444'
                                : e.conflict?.severity === 'HIGH'
                                ? '#f97316'
                                : '#475569',
                            strokeWidth: e.conflict ? 3 : 1,
                          },
                          label: e.conflict?.type,
                          labelStyle: { fill: '#ef4444', fontSize: '10px' },
                        }))}
                        fitView
                        attributionPosition="bottom-left"
                      >
                        <Background color="#1e293b" />
                        <Controls />
                      </ReactFlow>
                    </div>
                  ) : (
                    <div className="flex h-64 items-center justify-center text-slate-500">
                      Load a scenario and click Verify to see the policy graph
                    </div>
                  )}
                </div>
              )}

              {/* Fixes Tab */}
              {activeTab === 'fixes' && (
                <div>
                  {result && result.fixes.length > 0 ? (
                    result.fixes.map((fix, i) => (
                      <div
                        key={fix.conflictId}
                        className="mb-4 rounded border border-slate-700 bg-slate-950 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-400">
                            Fix for {fix.conflictId}
                          </span>
                          <button
                            onClick={() => handleCopy(JSON.stringify(fix, null, 2))}
                            className="text-xs text-slate-400 hover:text-slate-200"
                          >
                            Copy
                          </button>
                        </div>
                        
                        {/* Cisco CLI */}
                        {fix.ciscoCLI.length > 0 && (
                          <div className="mb-3">
                            <div className="mb-1 text-xs font-medium text-slate-400">Cisco CLI:</div>
                            <pre className="overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-300">
                              {fix.ciscoCLI.join('\n')}
                            </pre>
                          </div>
                        )}
                        
                        {/* AWS JSON Patch */}
                        <div className="mb-3">
                          <div className="mb-1 text-xs font-medium text-slate-400">AWS JSON Patch:</div>
                          <pre className="overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-300">
                            {JSON.stringify(fix.awsJsonPatch, null, 2)}
                          </pre>
                        </div>
                        
                        {/* Explanation */}
                        <div>
                          <div className="mb-1 text-xs font-medium text-slate-400">Explanation:</div>
                          <p className="text-xs text-slate-300">{fix.explanation}</p>
                        </div>
                      </div>
                    ))
                  ) : result ? (
                    <div className="text-center text-slate-500">No fixes needed ✓</div>
                  ) : (
                    <div className="text-center text-slate-500">
                      Load a scenario and click Verify to see fix recommendations
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Meta Info */}
            {result && (
              <div className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Cisco Rules: {result.meta.ciscoRuleCount}</span>
                  <span>AWS Rules: {result.meta.awsRuleCount}</span>
                  <span>Conflicts: {result.meta.conflictCount}</span>
                  <span>Latency: {result.meta.latencyMs}ms</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
