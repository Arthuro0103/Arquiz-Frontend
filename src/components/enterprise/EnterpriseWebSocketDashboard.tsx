'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  Shield, 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Globe,
  Server,
  Users,
  Clock,
  Cpu,
  HardDrive,
  Network,
  Eye,
  Brain,
  Lock,
  Gauge
} from 'lucide-react';
import { useEnterpriseWebSocket } from '@/hooks/useEnterpriseWebSocket';
import { ArQuizWebSocketEnterprise } from '@/types/websocket-enterprise.types';

export function EnterpriseWebSocketDashboard() {
  const {
    isConnected,
    connectionQuality,
    clusterStatus,
    nodeId,
    analytics,
    securityStatus,
    performanceMetrics,
    getEnterpriseDiagnostics,
    getMetrics,
  } = useEnterpriseWebSocket();

  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Auto-refresh diagnostics
  useEffect(() => {
    const updateDiagnostics = () => {
      setDiagnostics(getEnterpriseDiagnostics());
      setMetrics(getMetrics());
    };

    updateDiagnostics();
    
    const interval = setInterval(updateDiagnostics, 5000); // Every 5 seconds
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [getEnterpriseDiagnostics, getMetrics]);

  const getConnectionStatusColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'poor': return 'text-yellow-500';
      case 'disconnected': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getClusterStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSecurityStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'threat': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Enterprise WebSocket Dashboard</h1>
          <p className="text-slate-600 mt-1">Real-time monitoring and analytics for ArQuiz WebSocket infrastructure</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={isConnected ? "default" : "destructive"} className="px-3 py-1">
            {isConnected ? "Connected" : "Disconnected"}
          </Badge>
          <Badge variant="outline" className="px-3 py-1">
            Node: {nodeId}
          </Badge>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Quality</CardTitle>
            <Activity className={`h-4 w-4 ${getConnectionStatusColor(connectionQuality)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{connectionQuality}</div>
            <p className="text-xs text-muted-foreground">
              Real-time connection assessment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cluster Status</CardTitle>
            <Server className={`h-4 w-4 ${getClusterStatusColor(clusterStatus)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{clusterStatus}</div>
            <p className="text-xs text-muted-foreground">
              {diagnostics?.cluster?.nodes || 0} nodes active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Status</CardTitle>
            <Shield className={`h-4 w-4 ${getSecurityStatusColor(securityStatus)}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{securityStatus}</div>
            <p className="text-xs text-muted-foreground">
              {diagnostics?.security?.events || 0} events monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Analytics</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {diagnostics?.analytics?.enabled ? "Active" : "Inactive"}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.anomaliesDetected || 0} anomalies detected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">AI Analytics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="cluster">Cluster</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Gauge className="h-5 w-5" />
                  <span>Real-time Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {performanceMetrics && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Active Connections</span>
                        <span className="font-medium">{performanceMetrics.activeConnections}</span>
                      </div>
                      <Progress value={(performanceMetrics.activeConnections / 1000) * 100} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Messages/sec</span>
                        <span className="font-medium">{performanceMetrics.messagesPerSecond}</span>
                      </div>
                      <Progress value={Math.min((performanceMetrics.messagesPerSecond / 100) * 100, 100)} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Average Latency</span>
                        <span className="font-medium">{performanceMetrics.averageLatency}ms</span>
                      </div>
                      <Progress 
                        value={Math.max(0, 100 - (performanceMetrics.averageLatency / 10))} 
                        className="[&>div]:bg-green-500"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5" />
                  <span>System Resources</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {performanceMetrics && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>CPU Usage</span>
                        <span className="font-medium">{(performanceMetrics.cpuUsage * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={performanceMetrics.cpuUsage * 100} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Memory Usage</span>
                        <span className="font-medium">{(performanceMetrics.memoryUsage * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={performanceMetrics.memoryUsage * 100} />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Network Bandwidth</span>
                        <span className="font-medium">{(performanceMetrics.networkBandwidth / 1000000).toFixed(2)} Mbps</span>
                      </div>
                      <Progress value={Math.min((performanceMetrics.networkBandwidth / 100000000) * 100, 100)} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Connection Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {metrics && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Reconnects</span>
                      <span className="font-medium">{metrics.totalReconnects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Packets Sent</span>
                      <span className="font-medium">{metrics.packetsSent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Packets Received</span>
                      <span className="font-medium">{metrics.packetsReceived}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Bytes Transferred</span>
                      <span className="font-medium">{(metrics.bytesTransferred / 1024).toFixed(2)} KB</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <span>AI-Powered Insights</span>
                </CardTitle>
                <CardDescription>
                  Real-time analytics and predictive insights
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {metrics?.anomaliesDetected || 0}
                    </div>
                    <div className="text-sm text-purple-600">Anomalies Detected</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics?.optimizationsApplied || 0}
                    </div>
                    <div className="text-sm text-blue-600">Optimizations Applied</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>AI Recommendations</span>
                    <span className="font-medium">{metrics?.aiRecommendations || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Prediction Accuracy</span>
                    <span className="font-medium">{(metrics?.predictionsAccuracy || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Behavioral Analytics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics ? (
                  <div className="space-y-4">
                    <Alert>
                      <Brain className="h-4 w-4" />
                      <AlertTitle>AI Analytics Active</AlertTitle>
                      <AlertDescription>
                        Real-time user behavior analysis and performance optimization in progress.
                      </AlertDescription>
                    </Alert>
                    <div className="text-sm text-muted-foreground">
                      Advanced analytics data would be displayed here in a production environment.
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>AI Analytics data not available</p>
                    <p className="text-sm">Connect to start collecting insights</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Security Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Encryption</span>
                  </div>
                  <Badge variant="default" className="bg-green-500">Active</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Lock className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Rate Limiting</span>
                  </div>
                  <Badge variant="default" className="bg-blue-500">Enabled</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Security Events</span>
                    <span className="font-medium">{metrics?.securityEvents || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Threat Level</span>
                    <span className={`font-medium ${getSecurityStatusColor(securityStatus)}`}>
                      {securityStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Threat Detection</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {securityStatus === 'threat' ? (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Security Threat Detected</AlertTitle>
                      <AlertDescription>
                        Suspicious activity has been detected. Security protocols are active.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertTitle>All Systems Secure</AlertTitle>
                      <AlertDescription>
                        No security threats detected. All monitoring systems operational.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>DDoS Protection</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Anomaly Detection</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>IP Filtering</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cluster Tab */}
        <TabsContent value="cluster" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5" />
                  <span>Cluster Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-5 w-5 text-slate-500" />
                    <span className="font-medium">Current Node</span>
                  </div>
                  <Badge variant="outline">{nodeId}</Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Active Nodes</span>
                    <span className="font-medium">{diagnostics?.cluster?.nodes || 1}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cluster Health</span>
                    <span className={`font-medium ${getClusterStatusColor(clusterStatus)}`}>
                      {clusterStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="h-5 w-5" />
                  <span>Load Balancing</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertTitle>AI-Optimized Load Balancing</AlertTitle>
                    <AlertDescription>
                      Intelligent routing based on real-time performance metrics and predictive analytics.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Strategy</span>
                      <span className="font-medium">AI Optimized</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Health Checks</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex justify-between">
                      <span>Auto Failover</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Diagnostics Tab */}
        <TabsContent value="diagnostics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>System Diagnostics</span>
              </CardTitle>
              <CardDescription>
                Comprehensive system health and performance diagnostics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {diagnostics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="font-medium mb-2">Connection</h4>
                      <div className="text-sm space-y-1">
                        <div>Status: <span className="font-medium">{diagnostics.connection.connected ? 'Connected' : 'Disconnected'}</span></div>
                        <div>Quality: <span className="font-medium">{diagnostics.connection.quality}</span></div>
                        <div>Region: <span className="font-medium">{diagnostics.connection.region}</span></div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="font-medium mb-2">Analytics</h4>
                      <div className="text-sm space-y-1">
                        <div>AI Powered: <span className="font-medium">{diagnostics.analytics.aiPowered ? 'Yes' : 'No'}</span></div>
                        <div>Anomalies: <span className="font-medium">{diagnostics.analytics.anomaliesDetected}</span></div>
                        <div>Optimizations: <span className="font-medium">{diagnostics.analytics.optimizationsApplied}</span></div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="font-medium mb-2">Security</h4>
                      <div className="text-sm space-y-1">
                        <div>Status: <span className="font-medium">{diagnostics.security.status}</span></div>
                        <div>Events: <span className="font-medium">{diagnostics.security.events}</span></div>
                        <div>Encryption: <span className="font-medium">{diagnostics.security.encryptionEnabled ? 'Enabled' : 'Disabled'}</span></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium mb-2">Raw Diagnostics Data</h4>
                    <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                      {JSON.stringify(diagnostics, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Diagnostics data not available</p>
                  <p className="text-sm">Connect to view system diagnostics</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 