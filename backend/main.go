package main

import (
	"net/http"
	"os/exec"
	"regexp"
	"runtime"
	"strings"
	"syscall"
	"time"

	"database/sql"

	_ "modernc.org/sqlite"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

type UsbDevice struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Status  string `json:"status"` // mapped/unmapped
	Vendor  string `json:"vendor"`
	Product string `json:"product"`
	Serial  string `json:"serial"`
}

// 内存假数据
var devices = []UsbDevice{
	{ID: "1", Name: "SanDisk Ultra USB 3.0", Status: "unmapped"},
	{ID: "2", Name: "Kingston DataTraveler", Status: "mapped"},
	{ID: "3", Name: "Logitech Unifying Receiver", Status: "unmapped"},
}

// usbipd-go list --json 输出结构体
// 你可根据实际 usbipd-go 输出调整结构体

type UsbipdListResult struct {
	Devices []struct {
		BusID   string `json:"busid"`
		Vendor  string `json:"vendor"`
		Product string `json:"product"`
		Serial  string `json:"serial"`
		State   string `json:"state"` // "Not shared"/"Shared"
	} `json:"devices"`
}

// 操作日志结构体
type OperationLog struct {
	Timestamp  time.Time `json:"timestamp"`
	DeviceID   string    `json:"device_id"`
	DeviceName string    `json:"device_name"`
	Action     string    `json:"action"` // map/unmap
	Result     string    `json:"result"` // success/fail
	ErrorMsg   string    `json:"error_msg,omitempty"`
}

var db *sql.DB

func initDB() error {
	var err error
	db, err = sql.Open("sqlite", "operation_logs.db")
	if err != nil {
		return err
	}
	createTableSQL := `CREATE TABLE IF NOT EXISTS operation_logs (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		timestamp TEXT,
		device_id TEXT,
		device_name TEXT,
		action TEXT,
		result TEXT,
		error_msg TEXT
	);`
	_, err = db.Exec(createTableSQL)
	return err
}

func insertLog(log OperationLog) error {
	_, err := db.Exec(`INSERT INTO operation_logs (timestamp, device_id, device_name, action, result, error_msg) VALUES (?, ?, ?, ?, ?, ?)`,
		log.Timestamp.Format(time.RFC3339), log.DeviceID, log.DeviceName, log.Action, log.Result, log.ErrorMsg)
	return err
}

func getAllLogs() ([]OperationLog, error) {
	rows, err := db.Query(`SELECT timestamp, device_id, device_name, action, result, error_msg FROM operation_logs ORDER BY id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var logs []OperationLog
	for rows.Next() {
		var log OperationLog
		var ts string
		if err := rows.Scan(&ts, &log.DeviceID, &log.DeviceName, &log.Action, &log.Result, &log.ErrorMsg); err != nil {
			continue
		}
		log.Timestamp, _ = time.Parse(time.RFC3339, ts)
		logs = append(logs, log)
	}
	return logs, nil
}

func main() {
	if err := initDB(); err != nil {
		panic("数据库初始化失败: " + err.Error())
	}
	r := gin.Default()

	r.Use(cors.Default())

	r.GET("/api/devices", func(c *gin.Context) {
		cmd := exec.Command("C:/Program Files/usbipd-win/usbipd.exe", "list")
		if runtime.GOOS == "windows" {
			cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		}
		output, err := cmd.Output()
		if err == nil {
			lines := strings.Split(string(output), "\n")
			var resp []UsbDevice
			re := regexp.MustCompile(`^(\S+)\s+(\S+)\s+(.+?)\s{2,}(.+)$`)
			rePersisted := regexp.MustCompile(`^([0-9a-fA-F\-]+)\s+(.+)$`)
			inConnected := false
			inPersisted := false
			for _, line := range lines {
				if strings.HasPrefix(line, "Connected:") {
					inConnected = true
					inPersisted = false
					continue
				}
				if strings.HasPrefix(line, "Persisted:") {
					inConnected = false
					inPersisted = true
					continue
				}
				if inConnected {
					if strings.HasPrefix(line, "BUSID") || strings.TrimSpace(line) == "" {
						continue
					}
					m := re.FindStringSubmatch(line)
					if len(m) == 5 {
						busid := m[1]
						vidpid := m[2]
						device := m[3]
						state := m[4]
						status := "unmapped"
						if strings.Contains(state, "Shared") {
							status = "mapped"
						}
						resp = append(resp, UsbDevice{
							ID:      busid,
							Name:    device,
							Status:  status,
							Vendor:  vidpid,
							Product: "",
							Serial:  "",
						})
					}
				}
				if inPersisted {
					if strings.HasPrefix(line, "GUID") || strings.TrimSpace(line) == "" {
						continue
					}
					m := rePersisted.FindStringSubmatch(line)
					if len(m) == 3 {
						guid := m[1]
						device := m[2]
						resp = append(resp, UsbDevice{
							ID:      guid,
							Name:    device,
							Status:  "persisted",
							Vendor:  "",
							Product: "",
							Serial:  "",
						})
					}
				}
			}
			c.JSON(http.StatusOK, resp)
			return
		}
		c.JSON(http.StatusOK, devices)
	})

	r.POST("/api/devices/:id/map", func(c *gin.Context) {
		id := c.Param("id")
		cmd := exec.Command("C:/Program Files/usbipd-win/usbipd.exe", "bind", "-b", id)
		if runtime.GOOS == "windows" {
			cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		}
		output, err := cmd.CombinedOutput()
		var log OperationLog
		log.Timestamp = time.Now()
		log.DeviceID = id
		log.Action = "map"
		log.DeviceName = id // 可后续优化为查找设备名
		if err == nil {
			log.Result = "success"
			insertLog(log)
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "设备已成功映射"})
			return
		}
		log.Result = "fail"
		log.ErrorMsg = err.Error() + ": " + string(output)
		insertLog(log)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "映射失败: " + log.ErrorMsg})
	})

	r.POST("/api/devices/:id/unmap", func(c *gin.Context) {
		id := c.Param("id")
		cmd := exec.Command("C:/Program Files/usbipd-win/usbipd.exe", "unbind", "-b", id)
		if runtime.GOOS == "windows" {
			cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
		}
		output, err := cmd.CombinedOutput()
		var log OperationLog
		log.Timestamp = time.Now()
		log.DeviceID = id
		log.Action = "unmap"
		log.DeviceName = id // 可后续优化为查找设备名
		if err == nil {
			log.Result = "success"
			insertLog(log)
			c.JSON(http.StatusOK, gin.H{"success": true, "message": "设备已成功解绑"})
			return
		}
		log.Result = "fail"
		log.ErrorMsg = err.Error() + ": " + string(output)
		insertLog(log)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "解绑失败: " + log.ErrorMsg})
	})

	r.GET("/api/devices/:id", func(c *gin.Context) {
		id := c.Param("id")
		for _, d := range devices {
			if d.ID == id {
				c.JSON(http.StatusOK, d)
				return
			}
		}
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "设备不存在"})
	})

	r.GET("/api/logs", func(c *gin.Context) {
		logs, err := getAllLogs()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "日志查询失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, logs)
	})

	r.Run(":8080") // 默认监听 8080 端口
}
