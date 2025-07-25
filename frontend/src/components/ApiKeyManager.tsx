import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
} from '@mui/material'
import {
  VpnKey,
  Add,
  Edit,
  Delete,
  Science,
  Check,
  Error,
  ExpandMore,
  Security,
  Warning,
  Mic,
  Close,
  Visibility,
  VoiceChat as TTSIcon,
  Psychology as AIIcon,
  Hub as EmbeddingIcon,
  PowerOff,
  ToggleOff,
  ToggleOn,
} from '@mui/icons-material'

interface ApiKeyData {
  provider_id: string
  provider_name: string
  provider_type: 'ASR' | 'TTS' | 'AI' | 'Embedding'
  requires_api_key: boolean
  api_key_type: string
  has_api_key: boolean
  api_key_preview?: string
  is_activated: boolean
  last_test_date?: string
  last_transcription?: string
  test_model_used?: string
  test_language_used?: string
  test_processing_time?: number
  provider_icon_url?: string
  provider_logo_url?: string
}

interface ApiKeyManagerProps {
  accessToken: string
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ accessToken }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAiType, setSelectedAiType] = useState<'ASR' | 'TTS' | 'AI' | 'Embedding'>('ASR')
  const [editDialog, setEditDialog] = useState<{
    open: boolean
    provider?: ApiKeyData
    apiKey: string
  }>({
    open: false,
    apiKey: ''
  })
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean; result?: any; error?: string }>>({})

  const fetchApiKeys = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/api-keys', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch API keys')
      }

      const data = await response.json()
      if (data.success) {
        setApiKeys(data.data || [])
      } else {
        setError(data.error || 'Failed to load API keys')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveApiKey = async () => {
    if (!editDialog.provider || !editDialog.apiKey) return

    try {
      const response = await fetch(`/api/admin/api-keys/${editDialog.provider.provider_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: editDialog.apiKey,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setEditDialog({ open: false, apiKey: '' })
        fetchApiKeys()
      } else {
        setError(data.error || 'Failed to save API key')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key')
    }
  }

  const handleDeleteApiKey = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return

    try {
      const response = await fetch(`/api/admin/api-keys/${providerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        fetchApiKeys()
      } else {
        setError(data.error || 'Failed to delete API key')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key')
    }
  }

  const handleTestApiKey = async (providerId: string) => {
    setTestResults(prev => ({
      ...prev,
      [providerId]: { loading: true }
    }))

    try {
      const response = await fetch(`/api/admin/api-keys/${providerId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()
      setTestResults(prev => ({
        ...prev,
        [providerId]: {
          loading: false,
          result: data.success ? data.test_result : null,
          error: data.success ? undefined : data.error
        }
      }))
      
      // Refresh API keys to update activation status
      if (data.success && data.provider_activated) {
        fetchApiKeys()
      }
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [providerId]: {
          loading: false,
          error: err instanceof Error ? err.message : 'Test failed'
        }
      }))
    }
  }

  const handleTestTranscription = async (providerId: string) => {
    setTestResults(prev => ({
      ...prev,
      [providerId]: { loading: true }
    }))

    try {
      const response = await fetch(`/api/admin/api-keys/${providerId}/test-transcription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()
      setTestResults(prev => ({
        ...prev,
        [providerId]: {
          loading: false,
          result: data.success ? data.test_result : null,
          error: data.success ? undefined : data.error,
          transcriptionTest: data.success ? {
            transcription: data.test_result?.transcription,
            model_used: data.model_used,
            language_used: data.language_used,
            processing_time: data.test_result?.processing_time
          } : undefined
        }
      }))
      
      // Refresh API keys to update activation status
      if (data.success) {
        fetchApiKeys()
      }
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [providerId]: {
          loading: false,
          error: err instanceof Error ? err.message : 'Transcription test failed'
        }
      }))
    }
  }

  const handleActivateAll = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/activate-all-providers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setError(`✅ ${data.message}`)
        fetchApiKeys() // Refresh to show updated activation status
      } else {
        setError(data.error || 'Failed to activate providers')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate providers')
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivateProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to deactivate this provider? It will no longer be available for testing.')) return
    
    try {
      const response = await fetch(`/api/admin/api-keys/${providerId}/deactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setError(`✅ ${data.message}`)
        fetchApiKeys() // Refresh to show updated activation status
      } else {
        setError(data.error || 'Failed to deactivate provider')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate provider')
    }
  }

  const handleReactivateProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to reactivate this provider?')) return
    
    try {
      const response = await fetch(`/api/admin/api-keys/${providerId}/reactivate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        setError(`✅ ${data.message}`)
        fetchApiKeys() // Refresh to show updated activation status
      } else {
        setError(data.error || 'Failed to reactivate provider')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate provider')
    }
  }

  const openEditDialog = (provider: ApiKeyData) => {
    setEditDialog({
      open: true,
      provider,
      apiKey: provider.api_key_preview || ''
    })
  }

  const getApiKeyTypeDescription = (type: string) => {
    switch (type) {
      case 'string':
        return 'Simple API key string'
      case 'json_file':
        return 'JSON service account file content'
      case 'none':
        return 'No API key required'
      default:
        return type
    }
  }

  const getAiTypeIcon = (type: 'ASR' | 'TTS' | 'AI' | 'Embedding') => {
    switch (type) {
      case 'ASR':
        return <Mic />
      case 'TTS':
        return <TTSIcon />
      case 'AI':
        return <AIIcon />
      case 'Embedding':
        return <EmbeddingIcon />
    }
  }

  // Provider Icon Component for API Key Management
  interface ProviderIconProps {
    provider_name: string
    provider_icon_url?: string
    size?: number
  }


  // Stable image error tracking outside component to prevent re-render issues
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  
  const ProviderIcon: React.FC<ProviderIconProps> = ({ provider_name, provider_icon_url, size = 20 }) => {
    const imageKey = `${provider_name}-${provider_icon_url}`
    const hasImageError = imageErrors[imageKey]
    
    const handleImageError = () => {
      setImageErrors(prev => ({ ...prev, [imageKey]: true }))
    }
    
    if (provider_icon_url && !hasImageError) {
      return (
        <Box
          component="img"
          src={provider_icon_url}
          alt={`${provider_name} icon`}
          sx={{
            width: size,
            height: size,
            borderRadius: '4px',
            objectFit: 'contain',
          }}
          onError={handleImageError}
        />
      )
    }

    // Fallback - provider initial in a styled box
    return (
      <Box
        sx={{
          width: size,
          height: size,
          backgroundColor: 'primary.main',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: `${size * 0.6}px`,
        }}
      >
        {provider_name ? provider_name.substring(0, 1).toUpperCase() : '?'}
      </Box>
    )
  }

  const filteredApiKeys = React.useMemo(() => {
    return apiKeys.filter(provider => provider.provider_type === selectedAiType)
      .map(provider => ({
        ...provider,
        // Ensure provider name is always available
        provider_name: provider.provider_name || provider.provider_id || `${provider.provider_type} Provider`,
      }))
  }, [apiKeys, selectedAiType])

  useEffect(() => {
    fetchApiKeys()
  }, [])

  // Debug: Log provider data when it changes
  useEffect(() => {
    if (selectedAiType === 'TTS' && apiKeys.length > 0) {
      console.log('TTS Providers:', filteredApiKeys.map(p => ({ 
        id: p.provider_id, 
        name: p.provider_name,
        type: p.provider_type 
      })))
    }
  }, [apiKeys, selectedAiType, filteredApiKeys])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        mb: 3,
        p: 3,
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <VpnKey sx={{ fontSize: '2rem', color: 'primary.main' }} />
          <Typography variant="h5" fontWeight="600" color="primary.main">
            API Key Management
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={fetchApiKeys}
            disabled={loading}
            sx={{
              background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #5a6fd8 30%, #6a4190 90%)',
              },
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Check />}
            onClick={handleActivateAll}
            disabled={loading}
            sx={{
              background: 'linear-gradient(45deg, #43e97b 30%, #38f9d7 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #39d870 30%, #32e6c5 90%)',
              },
            }}
          >
            Activate All
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* AI Type Tabs */}
      <Box sx={{ 
        mb: 3,
        p: 2,
        borderRadius: 3,
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <Tabs 
          value={selectedAiType} 
          onChange={(_, newValue) => setSelectedAiType(newValue)}
          sx={{ 
            '& .MuiTab-root': { 
              minWidth: 'auto',
              fontWeight: 600,
            }
          }}
        >
          <Tab 
            icon={<Mic />} 
            iconPosition="start"
            label="ASR" 
            value="ASR" 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            icon={<TTSIcon />} 
            iconPosition="start"
            label="TTS" 
            value="TTS" 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            icon={<AIIcon />} 
            iconPosition="start"
            label="AI Models" 
            value="AI" 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            icon={<EmbeddingIcon />} 
            iconPosition="start"
            label="Embedding" 
            value="Embedding" 
            sx={{ textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Provider</TableCell>
              <TableCell>AI Type</TableCell>
              <TableCell>Key Type</TableCell>
              <TableCell>API Key Status</TableCell>
              <TableCell>Activation Status</TableCell>
              <TableCell>API Key</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredApiKeys.map((provider) => (
              <TableRow key={`apikey-${provider.provider_id}`} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ProviderIcon
                      provider_name={provider.provider_name}
                      provider_icon_url={provider.provider_icon_url}
                      size={20}
                    />
                    <Typography 
                      variant="body2" 
                      fontWeight="600"
                      sx={{ minWidth: '150px' }} // Prevent layout shift
                    >
                      {provider.provider_name}
                    </Typography>
                    {!provider.requires_api_key && (
                      <Chip
                        label="No API Key Required"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </TableCell>
                
                <TableCell>
                  <Chip
                    icon={getAiTypeIcon(provider.provider_type)}
                    label={provider.provider_type}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </TableCell>
                
                <TableCell>
                  <Tooltip title={getApiKeyTypeDescription(provider.api_key_type)}>
                    <Chip
                      label={provider.api_key_type}
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'uppercase' }}
                    />
                  </Tooltip>
                </TableCell>
                
                <TableCell>
                  {provider.requires_api_key ? (
                    provider.has_api_key ? (
                      <Chip
                        label="Configured"
                        size="small"
                        color="success"
                        icon={<Check />}
                      />
                    ) : (
                      <Chip
                        label="Missing"
                        size="small"
                        color="error"
                        icon={<Warning />}
                      />
                    )
                  ) : (
                    <Chip
                      label="Not Required"
                      size="small"
                      color="default"
                      icon={<Security />}
                    />
                  )}
                </TableCell>
                
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {provider.is_activated ? (
                      <Chip
                        label="Activated"
                        size="small"
                        color="success"
                        icon={<Check />}
                      />
                    ) : (
                      <Chip
                        label="Not Activated"
                        size="small"
                        color="default"
                        icon={<Warning />}
                      />
                    )}
                    
                    {/* Deactivate/Reactivate buttons */}
                    {provider.is_activated ? (
                      <Tooltip title="Deactivate Provider">
                        <IconButton
                          size="small"
                          onClick={() => handleDeactivateProvider(provider.provider_id)}
                          color="warning"
                          sx={{ ml: 1 }}
                        >
                          <PowerOff />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Reactivate Provider">
                        <IconButton
                          size="small"
                          onClick={() => handleReactivateProvider(provider.provider_id)}
                          color="success"
                          sx={{ ml: 1 }}
                        >
                          <ToggleOn />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  
                  {provider.last_test_date && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                      Last tested: {new Date(provider.last_test_date).toLocaleDateString()}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell>
                  {provider.has_api_key && provider.api_key_preview ? (
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {provider.api_key_preview}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {provider.requires_api_key ? 'Not configured' : 'N/A'}
                    </Typography>
                  )}
                </TableCell>
                
                <TableCell align="center">
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                    {provider.requires_api_key && (
                      <>
                        <Tooltip title={provider.has_api_key ? 'Edit API Key' : 'Add API Key'}>
                          <IconButton
                            size="small"
                            onClick={() => openEditDialog(provider)}
                            color="primary"
                          >
                            {provider.has_api_key ? <Edit /> : <Add />}
                          </IconButton>
                        </Tooltip>
                        
                        {provider.has_api_key && (
                          <>
                            <Tooltip title="Test Connection">
                              <IconButton
                                size="small"
                                onClick={() => handleTestApiKey(provider.provider_id)}
                                color="info"
                                disabled={testResults[provider.provider_id]?.loading}
                              >
                                {testResults[provider.provider_id]?.loading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <Science />
                                )}
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Test Transcription (welcome.wav)">
                              <IconButton
                                size="small"
                                onClick={() => handleTestTranscription(provider.provider_id)}
                                color="success"
                                disabled={testResults[provider.provider_id]?.loading}
                              >
                                {testResults[provider.provider_id]?.loading ? (
                                  <CircularProgress size={16} />
                                ) : (
                                  <Mic />
                                )}
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Delete API Key">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteApiKey(provider.provider_id)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        
                        {/* Test buttons for providers that don't require API keys */}
                        {!provider.requires_api_key && (
                          <Tooltip title="Test Transcription (welcome.wav)">
                            <IconButton
                              size="small"
                              onClick={() => handleTestTranscription(provider.provider_id)}
                              color="success"
                              disabled={testResults[provider.provider_id]?.loading}
                            >
                              {testResults[provider.provider_id]?.loading ? (
                                <CircularProgress size={16} />
                              ) : (
                                <Mic />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    )}
                    
                    {/* Dashboard button for all providers */}
                    <Tooltip title="View Provider Dashboard">
                      <IconButton
                        size="small"
                        onClick={() => window.open(`/admin/provider/${provider.provider_id}`, '_blank')}
                        color="info"
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {/* Test Results */}
                  {testResults[provider.provider_id] && (
                    <Box sx={{ mt: 1 }}>
                      {testResults[provider.provider_id].result && (
                        <Chip
                          label="Connection OK"
                          size="small"
                          color="success"
                          icon={<Check />}
                        />
                      )}
                      {testResults[provider.provider_id].transcriptionTest && (
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label="Transcription OK"
                            size="small"
                            color="success"
                            icon={<Mic />}
                          />
                          <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                            <strong>Result:</strong> "{testResults[provider.provider_id].transcriptionTest.transcription || 'No transcription'}"
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                            Model: {testResults[provider.provider_id].transcriptionTest.model_used} | 
                            Language: {testResults[provider.provider_id].transcriptionTest.language_used} | 
                            Time: {testResults[provider.provider_id].transcriptionTest.processing_time?.toFixed(2)}s
                          </Typography>
                        </Box>
                      )}
                      {testResults[provider.provider_id].error && (
                        <Tooltip title={testResults[provider.provider_id].error}>
                          <Chip
                            label="Test Failed"
                            size="small"
                            color="error"
                            icon={<Error />}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Instructions */}
      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="h6">
            API Key Setup Instructions
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body2">
              <strong>Google Cloud Speech-to-Text:</strong> Paste the entire JSON service account file content
            </Typography>
            <Typography variant="body2">
              <strong>ElevenLabs:</strong> Enter your API key from the ElevenLabs dashboard
            </Typography>
            <Typography variant="body2">
              <strong>Fireworks AI:</strong> Enter your API key from the Fireworks AI console
            </Typography>
            <Typography variant="body2">
              <strong>Sarv ASR:</strong> No API key required - uses local service
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Edit Dialog */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, apiKey: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editDialog.provider?.has_api_key ? 'Edit' : 'Add'} API Key for {editDialog.provider?.provider_name}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`API Key (${editDialog.provider?.api_key_type})`}
            fullWidth
            multiline={editDialog.provider?.api_key_type === 'json_file'}
            rows={editDialog.provider?.api_key_type === 'json_file' ? 8 : 1}
            value={editDialog.apiKey}
            onChange={(e) => setEditDialog(prev => ({ ...prev, apiKey: e.target.value }))}
            placeholder={
              editDialog.provider?.api_key_type === 'json_file'
                ? 'Paste the entire JSON service account file content here...'
                : 'Enter your API key here...'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, apiKey: '' })}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveApiKey}
            variant="contained"
            disabled={!editDialog.apiKey.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ApiKeyManager