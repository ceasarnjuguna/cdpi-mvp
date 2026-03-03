"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { VerifyResponse } from '@/lib/types'
import {
  Shield,
  AlertTriangle,
  Network,
  Wrench,
  Users,
  Cloud,
  Clock,
  Loader2,
  Zap,
  AlertCircle,
  ChevronRight,
} from "lucide-react"

export default function CDPIPage() {
  const [ciscoConfig, setCiscoConfig] = useState("")
  const [awsSgJson, setAwsSgJson] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("conflicts")
  const [result, setResult] = useState<VerifyResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLoadDemo = async (n: 1 | 2 | 3) => {
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/demo/${n}`)
      const demo = await res.json()
      setCiscoConfig(demo.ciscoConfig)
      setAwsSgJson(demo.awsSgJson)
    } catch {
      setError('Failed to load demo scenario')
    }
  }

  const handleVerify = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciscoConfig, awsSgJson }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Verification failed')
      setResult(data as VerifyResponse)
      setActiveTab('conflicts')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-gray-100">
      {/* Header */}
      <header className="border-b border-[#2a3441] bg-[#0f1419]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/30">
              <Shield className="w-6 h-6 text-teal-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">
                Cross-Domain Policy Integration
              </h1>
              <p className="text-sm text-gray-500">
                Network Security Policy Verification Tool
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-[1800px] mx-auto px-6 pt-4">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto p-6">
        <div className="flex gap-6 min-h-[calc(100vh-120px)]">
          {/* Left Panel - 40% */}
          <div className="w-[40%] flex flex-col gap-6">
            {/* Configuration Inputs Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-200">
                Configuration Inputs
              </h2>
            </div>

            {/* Demo Scenario Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleLoadDemo(1)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 
                  bg-[#1a1f2e] border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:ring-2 hover:ring-red-500/20"
              >
                <Zap className="w-3.5 h-3.5" />
                Demo 1: Shadow Rule
              </button>
              <button
                onClick={() => handleLoadDemo(2)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 
                  bg-[#1a1f2e] border border-orange-500/20 text-orange-400 hover:bg-orange-500/10 hover:ring-2 hover:ring-orange-500/20"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Demo 2: Asymmetric Boundary
              </button>
              <button
                onClick={() => handleLoadDemo(3)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 
                  bg-[#1a1f2e] border border-green-500/20 text-green-400 hover:bg-green-500/10 hover:ring-2 hover:ring-green-500/20"
              >
                <Shield className="w-3.5 h-3.5" />
                Demo 3: Clean Config
              </button>
              <button
                onClick={() => {
                  setCiscoConfig('');
                  setAwsSgJson('');
                  setResult(null);
                  setError(null);
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 
                  bg-[#1a1f2e] border border-gray-500/20 text-gray-400 hover:bg-gray-500/10 hover:ring-2 hover:ring-gray-500/20"
              >
                <Wrench className="w-3.5 h-3.5" />
                Custom Input
              </button>
            </div>

            {/* Cisco IOS ACL Textarea */}
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-sm font-medium text-gray-400">
                Cisco IOS ACL Configuration
              </label>
              <Textarea
                value={ciscoConfig}
                onChange={(e) => setCiscoConfig(e.target.value)}
                placeholder="Enter Cisco IOS ACL configuration here or load a demo scenario...

Example:
ip access-list extended MY-ACL
  permit tcp 10.0.0.0 0.0.255.255 any eq 443
  deny ip any any"
                className="flex-1 min-h-[200px] bg-[#0d1117] border-l-4 border-l-green-500 border-t-0 border-r-0 border-b-0 
                  rounded-lg font-mono text-sm text-gray-300 placeholder:text-gray-600 resize-none
                  focus:ring-2 focus:ring-green-500/30 focus:border-l-green-400 transition-all"
              />
            </div>

            {/* AWS Security Group Textarea */}
            <div className="flex flex-col gap-2 flex-1">
              <label className="text-sm font-medium text-gray-400">
                AWS Security Group JSON
              </label>
              <Textarea
                value={awsSgJson}
                onChange={(e) => setAwsSgJson(e.target.value)}
                placeholder='Enter AWS Security Group JSON here or load a demo scenario...

Example:
{
  "GroupId": "sg-abc123",
  "IpPermissions": [
    {
      "IpProtocol": "tcp",
      "FromPort": 443,
      "ToPort": 443,
      "IpRanges": [{"CidrIp": "10.0.0.0/16"}]
    }
  ]
}'
                className="flex-1 min-h-[200px] bg-[#0d1117] border-l-4 border-l-orange-500 border-t-0 border-r-0 border-b-0 
                  rounded-lg font-mono text-sm text-gray-300 placeholder:text-gray-600 resize-none
                  focus:ring-2 focus:ring-orange-500/30 focus:border-l-orange-400 transition-all"
              />
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerify}
              disabled={isLoading || !ciscoConfig || !awsSgJson}
              className="w-full h-12 relative overflow-hidden bg-gradient-to-r from-teal-500 to-cyan-500 
                hover:from-teal-400 hover:to-cyan-400 text-white font-medium text-base
                disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/25 
                hover:shadow-teal-500/40 transition-all duration-300"
            >
              {!isLoading && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                  animate-shimmer" />
              )}
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Policies...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  Verify Policies
                </>
              )}
            </Button>
          </div>

          {/* Right Panel - 60% */}
          <div className="w-[60%] flex flex-col gap-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="w-5 h-5" />}
                value={result?.meta.ciscoRuleCount ?? "-"}
                label="Cisco Rules"
                color="blue"
              />
              <StatCard
                icon={<Cloud className="w-5 h-5" />}
                value={result?.meta.awsRuleCount ?? "-"}
                label="AWS Rules"
                color="orange"
              />
              <StatCard
                icon={<AlertTriangle className="w-5 h-5" />}
                value={result?.meta.conflictCount ?? "-"}
                label="Conflicts Detected"
                color={result && result.meta.conflictCount > 0 ? "red" : "green"}
              />
              <StatCard
                icon={<Clock className="w-5 h-5" />}
                value={result ? `${result.meta.latencyMs}ms` : "-"}
                label="Analysis Time"
                color="teal"
              />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="bg-[#1a1f2e] border border-[#2a3441] p-1 h-auto">
                <TabsTrigger
                  value="conflicts"
                  className="data-[state=active]:bg-[#2a3441] data-[state=active]:text-red-400 
                    text-gray-400 gap-2 px-4 py-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Conflicts
                </TabsTrigger>
                <TabsTrigger
                  value="graph"
                  className="data-[state=active]:bg-[#2a3441] data-[state=active]:text-blue-400 
                    text-gray-400 gap-2 px-4 py-2"
                >
                  <Network className="w-4 h-4" />
                  Policy Graph
                </TabsTrigger>
                <TabsTrigger
                  value="fixes"
                  className="data-[state=active]:bg-[#2a3441] data-[state=active]:text-teal-400 
                    text-gray-400 gap-2 px-4 py-2"
                >
                  <Wrench className="w-4 h-4" />
                  Configuration Fixes
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 mt-4">
                <TabsContent value="conflicts" className="h-full m-0">
                  {!result ? (
                    <EmptyState />
                  ) : result.conflicts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 
                      bg-[#1a1f2e]/50 rounded-lg border border-[#2a3441]">
                      <div className="p-4 rounded-full bg-green-500/10 mb-4">
                        <Shield className="w-12 h-12 text-green-400" />
                      </div>
                      <h3 className="text-lg font-medium text-green-400 mb-2">
                        No Conflicts Detected
                      </h3>
                      <p className="text-gray-500 max-w-md">
                        The Cisco IOS ACL and AWS Security Group configurations are properly aligned.
                        All policies are consistent across both platforms.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {result.conflicts.map((conflict) => (
                        <ConflictCard key={conflict.id} conflict={conflict} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="graph" className="h-full m-0">
                  {!result ? (
                    <EmptyState />
                  ) : (
                    <div className="h-full bg-[#1a1f2e]/50 rounded-lg border border-[#2a3441] p-6">
                      <PolicyGraph result={result} />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="fixes" className="h-full m-0">
                  {!result ? (
                    <EmptyState />
                  ) : result.fixes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 
                      bg-[#1a1f2e]/50 rounded-lg border border-[#2a3441]">
                      <div className="p-4 rounded-full bg-teal-500/10 mb-4">
                        <Wrench className="w-12 h-12 text-teal-400" />
                      </div>
                      <h3 className="text-lg font-medium text-teal-400 mb-2">
                        No Fixes Required
                      </h3>
                      <p className="text-gray-500 max-w-md">
                        Your configuration is clean and well-aligned. No remediation actions are necessary.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {result.fixes.map((fix, index) => (
                        <FixCard key={fix.conflictId} fix={fix} index={index} />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>

    </div>
  )
}

// Stat Card Component
function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  color: "blue" | "orange" | "red" | "green" | "teal"
}) {
  const colorClasses = {
    blue: "text-blue-400",
    orange: "text-orange-400",
    red: "text-red-400",
    green: "text-green-400",
    teal: "text-teal-400",
  }

  return (
    <div className="bg-[#1a1f2e]/80 backdrop-blur-sm border border-[#2a3441] rounded-lg p-4 
      hover:border-[#3a4451] transition-colors">
      <div className="flex items-center gap-3">
        <div className={colorClasses[color]}>{icon}</div>
        <div>
          <div className={`text-2xl font-bold ${colorClasses[color]}`}>
            {value}
          </div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  )
}

// Empty State Component
function EmptyState() {
  return (
    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 
      bg-[#1a1f2e]/50 rounded-lg border border-[#2a3441]">
      <div className="p-4 rounded-full bg-[#2a3441]/50 mb-4">
        <Shield className="w-16 h-16 text-gray-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-400 mb-2">
        No analysis performed yet
      </h3>
      <p className="text-gray-600 max-w-md">
        {"Load a demo scenario and click 'Verify Policies' to begin"}
      </p>
    </div>
  )
}

// Conflict Card Component
function ConflictCard({
  conflict,
}: {
  conflict: {
    id: string
    type: string
    severity: string
    description: string
    ciscoRule: { rawLine: string }
    awsRule?: { rawLine: string }
    affectedCidr: { address: string; prefix: number }
    affectedPort: { from: number; to: number }
  }
}) {
  const isCritical = conflict.severity === "CRITICAL"
  const isHigh = conflict.severity === "HIGH"

  return (
    <div className={`bg-[#1a1f2e]/80 backdrop-blur-sm rounded-lg border overflow-hidden
      ${isCritical ? "border-red-500/30" : isHigh ? "border-orange-500/30" : "border-yellow-500/30"}`}>
      <div className={`px-4 py-2 flex items-center gap-2 
        ${isCritical ? "bg-red-500/10" : isHigh ? "bg-orange-500/10" : "bg-yellow-500/10"}`}>
        <AlertTriangle className={`w-4 h-4 ${isCritical ? "text-red-400" : isHigh ? "text-orange-400" : "text-yellow-400"}`} />
        <span className={`text-sm font-medium ${isCritical ? "text-red-400" : isHigh ? "text-orange-400" : "text-yellow-400"}`}>
          {conflict.severity}
        </span>
        <span className="text-gray-300 font-medium ml-2">{conflict.type.replace(/_/g, ' ')}</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-gray-400 text-sm">{conflict.description}</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-green-400 w-16 shrink-0">Cisco:</span>
            <code className="text-xs font-mono text-gray-300 bg-[#0d1117] px-2 py-1 rounded">
              {conflict.ciscoRule.rawLine}
            </code>
          </div>
          {conflict.awsRule && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium text-orange-400 w-16 shrink-0">AWS:</span>
              <code className="text-xs font-mono text-gray-300 bg-[#0d1117] px-2 py-1 rounded">
                {conflict.awsRule.rawLine}
              </code>
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            Affected: {conflict.affectedCidr.address}/{conflict.affectedCidr.prefix} | Port: {conflict.affectedPort.from}
            {conflict.affectedPort.from !== conflict.affectedPort.to && `-${conflict.affectedPort.to}`}
          </div>
        </div>
      </div>
    </div>
  )
}

// Fix Card Component
function FixCard({
  fix,
  index,
}: {
  fix: {
    conflictId: string
    ciscoCLI: string[]
    awsJsonPatch: object
    explanation: string
  }
  index: number
}) {
  return (
    <div className="bg-[#1a1f2e]/80 backdrop-blur-sm rounded-lg border border-teal-500/30 overflow-hidden">
      <div className="px-4 py-2 flex items-center gap-2 bg-teal-500/10">
        <Wrench className="w-4 h-4 text-teal-400" />
        <span className="text-sm font-medium text-teal-400">FIX #{index + 1}</span>
        <span className="text-gray-300 font-medium ml-2">{fix.conflictId}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2">
          <ChevronRight className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
          <p className="text-gray-300 text-sm">{fix.explanation}</p>
        </div>
        {fix.ciscoCLI.length > 0 && (
          <div className="bg-[#0d1117] rounded-lg p-3 border border-[#2a3441]">
            <p className="text-xs text-gray-500 mb-2">Cisco CLI Commands:</p>
            <pre className="text-xs font-mono text-teal-300 whitespace-pre-wrap">
              {fix.ciscoCLI.join('\n')}
            </pre>
          </div>
        )}
        <div className="bg-[#0d1117] rounded-lg p-3 border border-[#2a3441]">
          <p className="text-xs text-gray-500 mb-2">AWS JSON Patch:</p>
          <pre className="text-xs font-mono text-orange-300 whitespace-pre-wrap overflow-x-auto">
            {JSON.stringify(fix.awsJsonPatch, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}

// Policy Graph Component
function PolicyGraph({ result }: { result: VerifyResponse }) {
  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Policy Flow Visualization</h3>
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-8">
          {/* Cisco Node */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 
              border border-green-500/30 flex items-center justify-center">
              <Users className="w-10 h-10 text-green-400" />
            </div>
            <span className="text-sm text-green-400 font-medium">Cisco IOS</span>
            <span className="text-xs text-gray-500">{result.meta.ciscoRuleCount} rules</span>
          </div>

          {/* Connection Lines */}
          <div className="flex flex-col items-center gap-2">
            <div className={`w-32 h-1 rounded-full ${
              result.meta.conflictCount > 0 
                ? "bg-gradient-to-r from-green-500 via-red-500 to-orange-500" 
                : "bg-gradient-to-r from-green-500 via-teal-500 to-orange-500"
            }`} />
            {result.meta.conflictCount > 0 && (
              <div className="flex items-center gap-1 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">{result.meta.conflictCount} conflicts</span>
              </div>
            )}
            {result.meta.conflictCount === 0 && (
              <div className="flex items-center gap-1 text-teal-400">
                <Shield className="w-4 h-4" />
                <span className="text-xs">Aligned</span>
              </div>
            )}
          </div>

          {/* AWS Node */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 
              border border-orange-500/30 flex items-center justify-center">
              <Cloud className="w-10 h-10 text-orange-400" />
            </div>
            <span className="text-sm text-orange-400 font-medium">AWS SG</span>
            <span className="text-xs text-gray-500">{result.meta.awsRuleCount} rules</span>
          </div>
        </div>
      </div>
    </div>
  )
}
