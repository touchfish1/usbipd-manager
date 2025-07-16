import { useState, useEffect } from 'react'
import { Container, Typography, Box, Paper, List, ListItem, ListItemText, Button, AppBar, Toolbar, CircularProgress, Snackbar, Alert, Chip, Dialog, DialogTitle, DialogContent, DialogActions, ListItemButton, Tooltip } from '@mui/material'
import UsbIcon from '@mui/icons-material/Usb';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import { Table as MuiTable, TableBody as MuiTableBody, TableRow as MuiTableRow, TableCell as MuiTableCell } from '@mui/material';

interface UsbDevice {
  id: string
  name: string
  status: string // mapped/unmapped
  vendor: string
  product: string
  serial: string
}

const API_BASE = 'http://localhost:8080/api'

function App() {
  const [devices, setDevices] = useState<UsbDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null) // 当前操作中的设备id
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success'|'error'}>({open: false, message: '', severity: 'success'})
  const [detail, setDetail] = useState<UsbDevice | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  // 获取设备列表
  const fetchDevices = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/devices`)
      const data = await res.json()
      setDevices(data)
    } catch (e) {
      setSnackbar({open: true, message: '获取设备列表失败', severity: 'error'})
    } finally {
      setLoading(false)
    }
  }

  // 定时刷新只更新设备数据，不影响其它UI状态
  useEffect(() => {
    fetchDevices()
    const timer = setInterval(() => {
      fetch(`${API_BASE}/devices`).then(res => res.json()).then(data => setDevices(data))
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  // 映射/解绑
  const handleToggleMapping = async (id: string, mapped: boolean) => {
    setActionLoading(id)
    try {
      const res = await fetch(`${API_BASE}/devices/${id}/${mapped ? 'unmap' : 'map'}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSnackbar({open: true, message: data.message, severity: 'success'})
        await fetchDevices()
      } else {
        setSnackbar({open: true, message: data.error || '操作失败', severity: 'error'})
      }
    } catch (e) {
      setSnackbar({open: true, message: (e instanceof Error ? e.message : '操作失败'), severity: 'error'})
    } finally {
      setActionLoading(null)
    }
  }

  // 查看详情
  const handleShowDetail = (device: UsbDevice) => {
    setDetail(device)
    setDetailOpen(true)
  }

  // 获取日志
  const fetchLogs = async () => {
    setLogLoading(true);
    try {
      const res = await fetch(`${API_BASE}/logs`);
      const data = await res.json();
      setLogs(data.reverse()); // 新日志在前
    } catch (e) {
      setSnackbar({open: true, message: '获取操作日志失败', severity: 'error'});
    } finally {
      setLogLoading(false);
    }
  };

  // 打开日志弹窗时拉取
  const handleOpenLog = () => {
    setLogOpen(true);
    fetchLogs();
  };

  // 导出CSV
  const exportLogsToCSV = () => {
    if (!logs.length) return;
    const header = ['时间','设备ID','操作','结果','错误信息'];
    const rows = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.device_id,
      log.action === 'map' ? '映射' : '解绑',
      log.result === 'success' ? '成功' : '失败',
      (log.error_msg || '').replace(/\r?\n/g, ' ')
    ]);
    const csvContent = [header, ...rows].map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usb_log_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', bgcolor: '#f5f5f5' }}>
      <AppBar position="static">
        <Toolbar>
          <UsbIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            USB 设备映射管理
          </Typography>
          <IconButton color="inherit" onClick={handleOpenLog} title="操作历史">
            <HistoryIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 2, width: '100%' }}>
          <Typography variant="h5" gutterBottom>USB 设备列表</Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : devices.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ my: 4 }}>
              暂无可用 USB 设备
            </Typography>
          ) : (
            <List>
              {devices.map(device => (
                <ListItem key={device.id} secondaryAction={
                  <Button
                    variant={device.status === 'mapped' ? 'outlined' : 'contained'}
                    color={device.status === 'mapped' ? 'secondary' : 'primary'}
                    onClick={() => handleToggleMapping(device.id, device.status === 'mapped')}
                    disabled={actionLoading === device.id}
                    startIcon={actionLoading === device.id ? <CircularProgress size={18} /> : null}
                  >
                    {device.status === 'mapped' ? '解绑' : '映射'}
                  </Button>
                }>
                  <ListItemButton onClick={() => handleShowDetail(device)}>
                    <ListItemText
                      primary={device.name}
                      secondary={<Chip label={device.status === 'mapped' ? '已映射' : '未映射'} color={device.status === 'mapped' ? 'success' : 'default'} size="small" />}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Container>
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>设备详情</DialogTitle>
        <DialogContent>
          {detail && (
            <MuiTable size="small" sx={{mb:2}}>
              <MuiTableBody>
                <MuiTableRow>
                  <MuiTableCell>设备ID</MuiTableCell>
                  <MuiTableCell>{detail.id || '-'}</MuiTableCell>
                </MuiTableRow>
                <MuiTableRow>
                  <MuiTableCell>名称</MuiTableCell>
                  <MuiTableCell>{detail.name || '-'}</MuiTableCell>
                </MuiTableRow>
                <MuiTableRow>
                  <MuiTableCell>厂商(VID:PID)</MuiTableCell>
                  <MuiTableCell>{detail.vendor || '-'}</MuiTableCell>
                </MuiTableRow>
                <MuiTableRow>
                  <MuiTableCell>产品</MuiTableCell>
                  <MuiTableCell>{detail.product || '-'}</MuiTableCell>
                </MuiTableRow>
                <MuiTableRow>
                  <MuiTableCell>序列号</MuiTableCell>
                  <MuiTableCell>{detail.serial || '-'}</MuiTableCell>
                </MuiTableRow>
                <MuiTableRow>
                  <MuiTableCell>状态</MuiTableCell>
                  <MuiTableCell>
                    <Chip label={detail.status === 'mapped' ? '已映射' : detail.status === 'persisted' ? '已持久化' : '未映射'} color={detail.status === 'mapped' ? 'success' : detail.status === 'persisted' ? 'info' : 'default'} size="small" />
                  </MuiTableCell>
                </MuiTableRow>
              </MuiTableBody>
            </MuiTable>
          )}
        </DialogContent>
        <DialogActions>
          {detail && (
            <Button
              variant={detail.status === 'mapped' ? 'outlined' : 'contained'}
              color={detail.status === 'mapped' ? 'secondary' : 'primary'}
              onClick={() => handleToggleMapping(detail.id, detail.status === 'mapped')}
              disabled={actionLoading === detail.id}
              startIcon={actionLoading === detail.id ? <CircularProgress size={18} /> : null}
            >
              {detail.status === 'mapped' ? '解绑' : '映射'}
            </Button>
          )}
          <Button onClick={() => setDetailOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={logOpen} onClose={() => setLogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span>操作历史</span>
          <IconButton onClick={exportLogsToCSV} size="small" title="导出CSV" disabled={!logs.length}>
            <DownloadIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {logLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : logs.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ my: 4 }}>
              暂无操作日志
            </Typography>
          ) : (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>时间</TableCell>
                    <TableCell>设备ID</TableCell>
                    <TableCell>操作</TableCell>
                    <TableCell>结果</TableCell>
                    <TableCell>错误信息</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{log.device_id}</TableCell>
                      <TableCell>
                        <Chip label={log.action === 'map' ? '映射' : '解绑'} color={log.action === 'map' ? 'primary' : 'secondary'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={log.result === 'success' ? '成功' : '失败'} color={log.result === 'success' ? 'success' : 'error'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={log.error_msg || '-'} placement="top" arrow>
                          <span style={{whiteSpace: 'pre-line', wordBreak: 'break-all', display: 'inline-block', maxWidth: 300}}>{log.error_msg || '-'}</span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({...snackbar, open: false})}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  )
}

export default App
