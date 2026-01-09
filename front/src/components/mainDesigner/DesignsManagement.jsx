import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  LinearProgress,
  Snackbar,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Visibility,
  Download,
  Upload,
  Image as ImageIcon,
  PictureAsPdf,
  Close,
  CheckCircle,
  Cancel,
  AttachFile,
  Note,
} from "@mui/icons-material";
import { mainDesignerService } from "../../services/api";
import { useApp } from "../../context/AppContext";
import { subscribeToDesigns } from "../../services/realtime";
import Swal from "sweetalert2";
import calmPalette from "../../theme/calmPalette";
import { USER_ROLES } from "../../constants";

const DesignsManagement = ({ showFormInTab = false, onDesignAdded }) => {
  const { user } = useApp();
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);
  const [viewingDesign, setViewingDesign] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedDesignNotes, setSelectedDesignNotes] = useState(null);
  const [statusChangeToasts, setStatusChangeToasts] = useState([]); // Array of toasts
  const [uploadingFiles, setUploadingFiles] = useState([]); // Array of { name, type }
  const [uploadProgress, setUploadProgress] = useState({});
  const [formData, setFormData] = useState({
    serialNumber: "",
    designDate: new Date().toISOString().split("T")[0],
    designImageKey: "",
    designFileKeys: [], // Array of objects: [{ serialNumber, printFileName, fileKey }]
  });
  const [uploadedFiles, setUploadedFiles] = useState({
    image: null,
    files: [], // Array of objects: [{ name, key, serialNumber, printFileName }]
  });
  // Filter states
  const [statusFilter, setStatusFilter] = useState("all"); // "all", 1, 2, 3
  const [dateFilter, setDateFilter] = useState(""); // Date string or empty
  const [sortField, setSortField] = useState(null); // null, "serialNumber", "date", "status"
  const [sortDirection, setSortDirection] = useState("asc"); // "asc", "desc"

  useEffect(() => {
    if (!showFormInTab) {
    loadDesigns();
    }
    if (showFormInTab) {
      // Reset form when showing in tab
      handleOpenDialog(null);
    }
  }, [showFormInTab]);

  // Subscribe to real-time design updates
  useEffect(() => {
    if (showFormInTab) return; // Don't subscribe if showing form in tab
    if (!user?.id) return; // Don't subscribe if no user
    
    let unsubscribe;
    (async () => {
      try {
        unsubscribe = await subscribeToDesigns({
          onDesignCreated: (designData) => {
            // Only reload if it belongs to current user
            if (designData && designData.createdBy === user.id) {
              loadDesigns();
            }
          },
          onDesignUpdated: (designData) => {
            // Only reload if it belongs to current user
            if (designData && designData.createdBy === user.id) {
              loadDesigns();
            }
          },
          onDesignStatusChanged: (designData) => {
            // Only reload if it belongs to current user
            if (designData && designData.createdBy === user.id) {
              // Find the previous status from current designs state
              const previousDesign = designs.find(d => d.id === designData.id);
              const previousStatus = previousDesign?.status;
              const newStatus = designData.status;
              
              // Show notification if status actually changed or if we don't have previous status
              if (previousStatus !== newStatus || !previousDesign) {
                const statusLabels = {
                  1: "في الانتظار",
                  2: "مقبول",
                  3: "مرفوض",
                  4: "مرتجع"
                };
                
                const statusIcons = {
                  1: "⏳",
                  2: "✅",
                  3: "❌",
                  4: "↩️"
                };
                
                // Determine severity based on new status
                let severity = "info";
                if (newStatus === 2) severity = "success";
                else if (newStatus === 3) severity = "error";
                else if (newStatus === 4) severity = "warning";
                
                const previousLabel = previousStatus ? statusLabels[previousStatus] : "غير محدد";
                const newLabel = statusLabels[newStatus] || "غير محدد";
                const icon = statusIcons[newStatus] || "";
                
                // Play notification sound
                try {
                  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                  const oscillator = audioContext.createOscillator();
                  const gainNode = audioContext.createGain();
                  
                  oscillator.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  oscillator.frequency.value = 800; // Frequency in Hz
                  oscillator.type = 'sine';
                  
                  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                  
                  oscillator.start(audioContext.currentTime);
                  oscillator.stop(audioContext.currentTime + 0.2);
                } catch (error) {
                  console.log("Could not play notification sound:", error);
                }
                
                // Add new toast to array (don't replace existing ones)
                const newToast = {
                  id: Date.now() + Math.random(), // Unique ID
                  open: true,
                  message: `تم تغيير حالة التصميم`,
                  severity: severity,
                  serialNumber: designData.serialNumber || "غير محدد",
                  previousStatus: previousLabel,
                  newStatus: `${icon} ${newLabel}`,
                  notes: designData.notes || ""
                };
                setStatusChangeToasts(prev => [...prev, newToast]);
              }
              
              loadDesigns();
            }
          },
        });
      } catch (err) {
      }
    })();

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.id, showFormInTab]);

  const loadDesigns = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        setDesigns([]);
        setLoading(false);
        return;
      }
      // Get designs only for the current user (designer)
      const data = await mainDesignerService.getDesignsByCreator(user.id);
      setDesigns(Array.isArray(data) ? data : []);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "فشل في تحميل التصاميم",
        confirmButtonColor: calmPalette.primary,
      });
      setDesigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (design = null) => {
    // Prevent opening dialog if design is accepted or rejected
    if (design && (design.status === 2 || design.status === 3)) {
      Swal.fire({
        icon: "warning",
        title: "غير مسموح",
        text: design.status === 2 
          ? "لا يمكن تعديل التصميم لأنه مقبول" 
          : "لا يمكن تعديل التصميم لأنه مرفوض",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }
    
    if (design) {
      setEditingDesign(design);
      // Convert designFileUrls to new format
      // designFileUrls is now array of objects: [{ serialNumber, printFileName, fileKey, downloadUrl }]
      const fileKeys = Array.isArray(design.designFileUrls) 
        ? design.designFileUrls.map((item) => {
            // If it's already an object with the new format
            if (typeof item === 'object' && item !== null && item.fileKey) {
              return {
                serialNumber: item.serialNumber || "",
                printFileName: item.printFileName || "",
                fileKey: item.fileKey,
              };
            }
            // Legacy format: string URL, try to extract fileKey
            if (typeof item === 'string') {
              return {
                serialNumber: "",
                printFileName: "",
                fileKey: extractFileKeyFromUrl(item) || item,
              };
            }
            // If it's an object but from designFileKeys (old format)
            if (typeof item === 'object' && item !== null) {
              return {
                serialNumber: item.serialNumber || "",
                printFileName: item.printFileName || "",
                fileKey: item.fileKey || "",
              };
            }
            return null;
          }).filter(Boolean)
        : [];
      
      // Extract fileKey from designImageUrl if designImageKey is not available
      let imageKey = design.designImageKey || "";
      if (!imageKey && design.designImageUrl) {
        // Try to extract fileKey from URL
        imageKey = extractFileKeyFromUrl(design.designImageUrl) || "";
      }
      
      setFormData({
        serialNumber: design.serialNumber || "",
        designDate: design.designDate ? design.designDate.split("T")[0] : new Date().toISOString().split("T")[0],
        designImageKey: imageKey,
        designFileKeys: fileKeys,
      });
      
      // Set uploaded files for display
      // For image, use designImageUrl if available, otherwise use designImageKey
      const imageName = design.designImageUrl 
        ? (design.designName || "صورة التصميم")
        : (design.designImageKey ? (design.designName || "صورة التصميم") : null);
      
      setUploadedFiles({
        image: imageKey || design.designImageUrl 
          ? { 
              name: imageName || "صورة التصميم", 
              key: imageKey,
              url: design.designImageUrl || null
            } 
          : null,
        files: fileKeys.map((item) => ({
          name: item.printFileName || item.fileKey || "ملف",
          key: item.fileKey,
          serialNumber: item.serialNumber || "",
          printFileName: item.printFileName || "",
        })),
      });
    } else {
      setEditingDesign(null);
      setFormData({
        serialNumber: "",
        designDate: new Date().toISOString().split("T")[0],
        designImageKey: "",
        designFileKeys: [],
      });
    setUploadedFiles({ image: null, files: [] });
    }
    if (!showFormInTab) {
    setOpenDialog(true);
    }
  };

  const handleCloseDialog = () => {
    if (!showFormInTab) {
    setOpenDialog(false);
    }
    setEditingDesign(null);
    setFormData({
      serialNumber: "",
      designName: "",
      designDate: new Date().toISOString().split("T")[0],
      designImageKey: "",
      designFileKeys: [],
    });
    setUploadedFiles({ image: null, files: [] });
    setUploadProgress({});
  };

  const handleFileSelect = async (file, type = "file") => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "application/octet-stream", "image/vnd.adobe.photoshop"];
    const isPSD = file.name.toLowerCase().endsWith(".psd");
    const isValidType = allowedTypes.includes(file.type) || isPSD;

    if (!isValidType) {
      Swal.fire({
        icon: "error",
        title: "نوع ملف غير مدعوم",
        text: "يرجى اختيار ملف PSD أو PNG",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    try {
      const fileIdentifier = `${type}_${file.name}`;
      setUploadingFiles((prev) => [...prev, { name: file.name, type, identifier: fileIdentifier }]);
      setUploadProgress((prev) => ({ ...prev, [fileIdentifier]: 0 }));

      // Step 1: Generate upload URL
      const contentType = isPSD ? "application/octet-stream" : file.type;
      const folder = type === "image" ? "designs/images" : "designs/files";
      
      const uploadData = await mainDesignerService.generateUploadUrl(
        file.name,
        file.size,
        contentType,
        folder
      );

      if (!uploadData.uploadUrl || !uploadData.fileKey) {
        throw new Error("فشل في الحصول على رابط الرفع");
      }

      // Step 2: Upload file directly to R2 using Presigned URL
      // The backend expects the file to be uploaded to R2 before confirming
      try {
        // Use fetch with PUT method to upload directly to R2
        // Important: Don't add any extra headers that aren't in the signed URL
        const uploadResponse = await fetch(uploadData.uploadUrl, {
          method: "PUT",
          body: file, // Send the file directly as body
          headers: {
            "Content-Type": contentType, // Must match the Content-Type used in signing
          },
          // Don't include credentials or other headers
        });

        if (!uploadResponse.ok) {
          let errorMessage = `فشل في رفع الملف (${uploadResponse.status})`;
          try {
            const errorText = await uploadResponse.text();
            if (errorText) {
              errorMessage += `: ${errorText}`;
            }
          } catch (e) {
          }
          throw new Error(errorMessage);
        }
      } catch (uploadError) {
        // Check if it's a CORS error
        if (uploadError.message.includes("CORS") || uploadError.message.includes("Failed to fetch")) {
          Swal.fire({
            icon: "error",
            title: "خطأ في CORS",
            html: `
              <div style="text-align: right; direction: rtl;">
                <p style="margin-bottom: 15px;"><strong>المشكلة:</strong> R2 bucket غير مهيأ لاستقبال الطلبات من هذا المصدر.</p>
                <p style="margin-bottom: 15px;"><strong>الحل:</strong></p>
                <ol style="text-align: right; padding-right: 20px; margin-bottom: 15px;">
                  <li>افتح Cloudflare Dashboard</li>
                  <li>اذهب إلى R2 → اختر Bucket الخاص بك</li>
                  <li>اذهب إلى Settings → CORS</li>
                  <li>أضف هذا الـ CORS configuration:</li>
                </ol>
                <pre style="text-align: left; background: #f5f5f5; padding: 15px; border-radius: 5px; direction: ltr; font-size: 12px; overflow-x: auto;">
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
                </pre>
                <p style="margin-top: 15px; font-size: 12px; color: #666;">
                  بعد إضافة CORS configuration، أعد تحميل الصفحة وجرب مرة أخرى.
                </p>
              </div>
            `,
            confirmButtonColor: calmPalette.primary,
            width: "700px",
            confirmButtonText: "فهمت",
          });
        }
        
        throw new Error(`فشل في رفع الملف إلى R2: ${uploadError.message}`);
      }

      // Step 3: Confirm upload with backend
      // Backend will verify the file exists in R2 before saving
      try {
        await mainDesignerService.confirmFileUpload(
          uploadData.fileKey,
          file.size,
          contentType
        );
      } catch (confirmError) {
        // Don't throw here - the file is already uploaded to R2
        // Just log the error and continue
        Swal.fire({
          icon: "warning",
          title: "تحذير",
          text: "تم رفع الملف إلى R2 لكن فشل تأكيد الرفع. قد تحتاج إلى إعادة المحاولة.",
          confirmButtonColor: calmPalette.primary,
          timer: 3000,
        });
      }

      // Update form data
      if (type === "image") {
        setFormData((prev) => {
          return { ...prev, designImageKey: uploadData.fileKey };
        });
        setUploadedFiles((prev) => ({ ...prev, image: { name: file.name, key: uploadData.fileKey } }));
      } else {
        // For files, create object with serialNumber and printFileName (empty initially, user will fill)
          const newFileObject = {
            serialNumber: "",
            printFileName: file.name,
            fileKey: uploadData.fileKey,
          };
          
        setFormData((prev) => {
            return {
            ...prev,
              designFileKeys: [...prev.designFileKeys, newFileObject],
          };
        });
        setUploadedFiles((prev) => ({
          ...prev,
          files: [...prev.files, { 
            name: file.name, 
            key: uploadData.fileKey,
            serialNumber: "",
            printFileName: file.name,
          }],
        }));
      }

      setUploadProgress((prev) => ({ ...prev, [fileIdentifier]: 100 }));
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((item) => item.identifier !== fileIdentifier));
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileIdentifier];
          return newProgress;
        });
      }, 1000);

      Swal.fire({
        icon: "success",
        title: "تم الرفع بنجاح",
        text: `تم رفع الملف ${file.name} بنجاح`,
        confirmButtonColor: calmPalette.primary,
        timer: 2000,
      });
    } catch (error) {
      const errorFileIdentifier = `${type}_${file.name}`;
      setUploadingFiles((prev) => prev.filter((item) => item.identifier !== errorFileIdentifier));
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[errorFileIdentifier];
        return newProgress;
      });
      Swal.fire({
        icon: "error",
        title: "خطأ في الرفع",
        text: error.message || "فشل في رفع الملف",
        confirmButtonColor: calmPalette.primary,
      });
    }
  };

  const handleRemoveFile = (type, index = null) => {
    if (type === "image") {
      setFormData((prev) => ({ ...prev, designImageKey: "" }));
      setUploadedFiles((prev) => ({ ...prev, image: null }));
    } else if (index !== null) {
      const newFiles = [...uploadedFiles.files];
      const newKeys = [...formData.designFileKeys];
      newFiles.splice(index, 1);
      newKeys.splice(index, 1);
      setUploadedFiles((prev) => ({ ...prev, files: newFiles }));
      setFormData((prev) => ({ ...prev, designFileKeys: newKeys }));
    }
  };

  const handleUpdateFileInfo = (index, field, value) => {
    // Update both uploadedFiles and formData to keep them in sync
    const newFiles = [...uploadedFiles.files];
    const newKeys = [...formData.designFileKeys];
    
    if (field === "serialNumber") {
      newFiles[index].serialNumber = value;
      newKeys[index].serialNumber = value;
    } else if (field === "printFileName") {
      newFiles[index].printFileName = value;
      newKeys[index].printFileName = value;
    }
    
    setUploadedFiles((prev) => ({ ...prev, files: newFiles }));
    setFormData((prev) => ({ ...prev, designFileKeys: newKeys }));
  };

  const handleSubmit = async () => {
    // التحقق من صلاحيات المستخدم
    if (!user || (user.role !== USER_ROLES.MAIN_DESIGNER && user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.DESIGN_MANAGER)) {
      Swal.fire({
        icon: "error",
        title: "غير مصرح",
        text: "المستخدم غير مصرح له بإنشاء التصاميم. يجب أن تكون MainDesigner أو Admin أو DesignManager",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    if (!formData.serialNumber || !formData.designDate) {
      Swal.fire({
        icon: "error",
        title: "بيانات ناقصة",
        text: "يرجى ملء جميع الحقول المطلوبة",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    if (!formData.designImageKey) {
      Swal.fire({
        icon: "error",
        title: "صورة التصميم مطلوبة",
        text: "يرجى رفع صورة للتصميم",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    // Validate that all files have serialNumber and printFileName
    const missingInfo = formData.designFileKeys.some(
      (file) => !file.serialNumber || !file.printFileName
    );
    
    if (missingInfo) {
      Swal.fire({
        icon: "error",
        title: "بيانات ناقصة",
        text: "يرجى إدخال الرقم التسلسلي واسم الملف لجميع الملفات المرفوعة",
        confirmButtonColor: calmPalette.primary,
      });
      return;
    }

    try {
      setLoading(true);
      
      // Prepare design data according to API spec
      const designPayload = {
        serialNumber: formData.serialNumber,
        designDate: formData.designDate,
        designImageKey: formData.designImageKey,
        designFileKeys: Array.isArray(formData.designFileKeys) 
          ? formData.designFileKeys.map((file) => ({
              serialNumber: file.serialNumber,
              printFileName: file.printFileName,
              fileKey: file.fileKey,
            }))
          : [],
      };
      
      
      if (editingDesign) {
        // Check if design is accepted or rejected - prevent update
        if (editingDesign.status === 2 || editingDesign.status === 3) {
          Swal.fire({
            icon: "error",
            title: "غير مسموح",
            text: editingDesign.status === 2 
              ? "لا يمكن تعديل التصميم لأنه مقبول" 
              : "لا يمكن تعديل التصميم لأنه مرفوض",
            confirmButtonColor: calmPalette.primary,
          });
          setLoading(false);
          return;
        }
        
        await mainDesignerService.updateDesign(editingDesign.id, designPayload);
        // Reset status to "في الانتظار" (1) after update
        await mainDesignerService.updateDesignStatus(editingDesign.id, 1, "");
        Swal.fire({
          icon: "success",
          title: "تم التحديث بنجاح",
          text: "تم تحديث التصميم بنجاح وتم إعادة الحالة إلى 'في الانتظار'",
          confirmButtonColor: calmPalette.primary,
          timer: 2000,
        });
      } else {
        await mainDesignerService.createDesign(designPayload);
        Swal.fire({
          icon: "success",
          title: "تم الإنشاء بنجاح",
          text: "تم إنشاء التصميم بنجاح",
          confirmButtonColor: calmPalette.primary,
          timer: 2000,
        });
      }
      handleCloseDialog();
      loadDesigns();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || "فشل في حفظ التصميم",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (designId) => {
    const result = await Swal.fire({
      title: "هل أنت متأكد؟",
      text: "هل أنت متأكد من حذف هذا التصميم؟",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "نعم، احذفه!",
      cancelButtonText: "إلغاء",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await mainDesignerService.deleteDesign(designId);
        Swal.fire({
          icon: "success",
          title: "تم الحذف!",
          text: "تم حذف التصميم بنجاح.",
          confirmButtonColor: calmPalette.primary,
        });
        loadDesigns();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "خطأ",
          text: "فشل في حذف التصميم",
          confirmButtonColor: calmPalette.primary,
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleViewDesign = async (design) => {
    try {
      setLoading(true);
      const fullDesign = await mainDesignerService.getDesignById(design.id);
      setViewingDesign(fullDesign);
      
      // توليد URL جديد للصورة باستخدام API
      if (fullDesign.designImageKey || fullDesign.designImageUrl) {
        try {
          // استخدام designImageKey إذا كان متوفراً، وإلا استخدم designImageUrl
          const fileKey = fullDesign.designImageKey || extractFileKeyFromUrl(fullDesign.designImageUrl);
          if (fileKey && typeof fileKey === 'string' && !fileKey.startsWith('http')) {
            const downloadData = await mainDesignerService.generateDownloadUrl(fileKey);
            if (downloadData.downloadUrl) {
              setImageUrl(downloadData.downloadUrl);
            } else {
              setImageUrl(fullDesign.designImageUrl);
            }
          } else {
            setImageUrl(fullDesign.designImageUrl);
          }
        } catch (error) {
          setImageUrl(fullDesign.designImageUrl);
        }
      } else {
        setImageUrl(null);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: "فشل في تحميل التصميم",
        confirmButtonColor: calmPalette.primary,
      });
    } finally {
      setLoading(false);
    }
  };

  // استخراج fileKey من URL
  const extractFileKeyFromUrl = (url) => {
    if (!url) return null;
    
    // إذا كان url هو object (من designFileKeys الجديد)، استخرج fileKey
    if (typeof url === 'object' && url !== null) {
      return url.fileKey || null;
    }
    
    // تأكد أن url هو string
    if (typeof url !== 'string') {
      return null;
    }
    
    // إذا كان URL يحتوي على cloudflarestorage.com، استخرج الـ fileKey
    try {
      const urlObj = new URL(url);
      // الـ fileKey يكون بعد اسم الـ bucket في الـ path
      // مثال: https://xxx.r2.cloudflarestorage.com/psbrandfile/designs/images/xxx.png
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      // نتخطى اسم الـ bucket (عادة أول جزء)
      if (pathParts.length > 1) {
        return pathParts.slice(1).join('/');
      }
      return pathParts[0] || null;
    } catch (e) {
      // إذا لم يكن URL صالح، قد يكون fileKey مباشرة
      if (typeof url === 'string' && url.startsWith('designs/')) {
        return url;
      }
      return null;
    }
  };

  const handleDownloadFile = async (fileKey, fileName) => {
    try {
      if (!fileKey) {
        throw new Error("FileKey غير متوفر");
      }

      // تنظيف fileKey - إزالة أي URLs كاملة
      let cleanFileKey = fileKey;
      if (typeof fileKey === 'string' && fileKey.startsWith('http')) {
        cleanFileKey = extractFileKeyFromUrl(fileKey);
        if (!cleanFileKey) {
          throw new Error("لا يمكن استخراج مفتاح الملف من الرابط");
        }
      }

      // استخدام API لتوليد download URL
      const downloadData = await mainDesignerService.generateDownloadUrl(cleanFileKey);
      if (downloadData.downloadUrl) {
        // إنشاء رابط تحميل
        const link = document.createElement('a');
        link.href = downloadData.downloadUrl;
        link.download = fileName || cleanFileKey.split('/').pop() || 'file';
        link.target = '_blank';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } else {
        throw new Error("فشل في توليد رابط التحميل");
      }
    } catch (error) {;
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في تحميل الملف",
        confirmButtonColor: calmPalette.primary,
      });
    }
  };

  // Render form content (used in both Dialog and Tab)
  const renderFormContent = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: showFormInTab ? 0 : 2 }}>
      {/* Basic Information Section */}
        <Paper
          elevation={0}
          sx={{
          p: 2,
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            borderRadius: 2,
            border: "1px solid rgba(94, 78, 62, 0.1)",
          }}
        >
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: calmPalette.textPrimary, fontSize: "0.95rem" }}>
          المعلومات الأساسية
          </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
            size="small"
              label="الرقم التسلسلي *"
              value={formData.serialNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))
              }
              required
            sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField
            size="small"
              type="date"
              label="تاريخ التصميم *"
              value={formData.designDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, designDate: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              required
            sx={{ flex: 1, minWidth: 200 }}
            />
        </Box>
      </Paper>

            {/* Image Upload */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: "rgba(255, 255, 255, 0.6)",
          borderRadius: 2,
          border: "1px solid rgba(94, 78, 62, 0.1)",
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: calmPalette.textPrimary, fontSize: "0.95rem" }}>
                صورة التصميم *
              </Typography>
              <input
                accept="image/png,image/jpeg,image/jpg,.psd"
                style={{ display: "none" }}
                id="image-upload"
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0], "image");
                  }
                }}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="outlined"
            size="small"
                  component="span"
                  startIcon={<Upload />}
                  fullWidth
                  sx={{
                    borderColor: calmPalette.primary,
                    color: calmPalette.primary,
                    "&:hover": {
                      borderColor: calmPalette.primaryDark,
                      backgroundColor: "rgba(94, 78, 62, 0.05)",
                    },
                  }}
                >
                  رفع صورة التصميم (PSD أو PNG)
                </Button>
              </label>
        
        {/* Show uploading image with loader */}
        {uploadingFiles.some((item) => item.type === "image" && !uploadedFiles.image) && !uploadedFiles.image ? (
          <Box
            sx={{
              mt: 2,
              p: 2,
              backgroundColor: "rgba(94, 78, 62, 0.05)",
              borderRadius: 2,
              border: "1px solid rgba(94, 78, 62, 0.2)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <CircularProgress size={24} sx={{ color: calmPalette.primary }} />
              <Typography variant="body2" sx={{ flex: 1 }}>
                جاري رفع الصورة...
              </Typography>
            </Box>
            <LinearProgress sx={{ mt: 1 }} />
            <Typography variant="caption" sx={{ mt: 1, display: "block", color: calmPalette.textSecondary }}>
              يرجى الانتظار حتى يكتمل الرفع
            </Typography>
          </Box>
        ) : uploadedFiles.image ? (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    backgroundColor: "rgba(94, 78, 62, 0.05)",
                    borderRadius: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
              border: uploadingFiles.some((item) => item.name === uploadedFiles.image.name && item.type === "image")
                ? "1px solid rgba(94, 78, 62, 0.2)" 
                : "1px solid rgba(94, 78, 62, 0.1)",
              opacity: uploadingFiles.some((item) => item.name === uploadedFiles.image.name && item.type === "image") ? 0.7 : 1,
            }}
          >
            {uploadingFiles.some((item) => item.name === uploadedFiles.image.name && item.type === "image") ? (
              <Box sx={{ width: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                  <CircularProgress size={20} sx={{ color: calmPalette.primary }} />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    جاري معالجة: {uploadedFiles.image.name}
                  </Typography>
                </Box>
                <LinearProgress sx={{ mt: 1 }} />
                <Typography variant="caption" sx={{ mt: 1, display: "block", color: calmPalette.textSecondary }}>
                  يرجى الانتظار حتى يكتمل الرفع
                </Typography>
              </Box>
            ) : (
              <>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircle sx={{ color: "success.main", fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {uploadedFiles.image.name}
                  </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile("image")}
                    sx={{ color: "error.main" }}
                  >
                    <Close />
                  </IconButton>
              </>
            )}
                </Box>
        ) : null}
      </Paper>

            {/* Files Upload */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          backgroundColor: "rgba(255, 255, 255, 0.6)",
          borderRadius: 2,
          border: "1px solid rgba(94, 78, 62, 0.1)",
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: calmPalette.textPrimary, fontSize: "0.95rem" }}>
                ملفات التصميم (اختياري)
              </Typography>
              <input
                accept=".psd,.png,.jpg,.jpeg"
                style={{ display: "none" }}
                id="files-upload"
                type="file"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    Array.from(e.target.files).forEach((file) => {
                      handleFileSelect(file, "file");
                    });
                  }
                }}
              />
              <label htmlFor="files-upload">
                <Button
                  variant="outlined"
            size="small"
                  component="span"
                  startIcon={<Upload />}
                  fullWidth
                  sx={{
                    borderColor: calmPalette.primary,
                    color: calmPalette.primary,
                    "&:hover": {
                      borderColor: calmPalette.primaryDark,
                      backgroundColor: "rgba(94, 78, 62, 0.05)",
                    },
                  }}
                >
                  رفع ملفات التصميم (متعدد)
                </Button>
              </label>
        
        {/* Show uploading files with loader */}
        {uploadingFiles.filter((item) => {
          return item.type === "file" && !uploadedFiles.files.some((f) => f.name === item.name);
        }).map((uploadingItem, uploadIndex) => (
          <Box
            key={`uploading-${uploadIndex}`}
                      sx={{
              mt: 2,
              p: 2,
                        backgroundColor: "rgba(94, 78, 62, 0.05)",
                        borderRadius: 2,
              border: "1px solid rgba(94, 78, 62, 0.2)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <CircularProgress size={24} sx={{ color: calmPalette.primary }} />
              <Typography variant="body2" sx={{ flex: 1 }}>
                جاري رفع: {uploadingItem.name}
              </Typography>
            </Box>
            <LinearProgress sx={{ mt: 1 }} />
            <Typography variant="caption" sx={{ mt: 1, display: "block", color: calmPalette.textSecondary }}>
              يرجى الانتظار حتى يكتمل الرفع
            </Typography>
          </Box>
        ))}
        
        {/* Show uploaded files */}
        {uploadedFiles.files.length > 0 && (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            {uploadedFiles.files.map((file, index) => {
              const isUploading = uploadingFiles.some((item) => item.name === file.name && item.type === "file");
              return (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: isUploading ? "rgba(94, 78, 62, 0.05)" : "rgba(94, 78, 62, 0.03)",
                    borderRadius: 2,
                    border: isUploading 
                      ? "1px solid rgba(94, 78, 62, 0.2)" 
                      : "1px solid rgba(94, 78, 62, 0.1)",
                    opacity: isUploading ? 0.7 : 1,
                  }}
                >
                  {isUploading ? (
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                        <CircularProgress size={20} sx={{ color: calmPalette.primary }} />
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          جاري معالجة: {file.name}
                        </Typography>
                      </Box>
                      <LinearProgress sx={{ mt: 1 }} />
                      <Typography variant="caption" sx={{ mt: 1, display: "block", color: calmPalette.textSecondary }}>
                        يرجى الانتظار حتى يكتمل الرفع
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                          <CheckCircle sx={{ color: "success.main", fontSize: 20 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {file.name}
                          </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveFile("file", index)}
                        sx={{ color: "error.main" }}
                      >
                        <Close />
                      </IconButton>
                    </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="الرقم التسلسلي *"
                            value={file.serialNumber || ""}
                            onChange={(e) => handleUpdateFileInfo(index, "serialNumber", e.target.value)}
                            placeholder="أدخل الرقم التسلسلي"
                            required
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            size="small"
                            label="اسم الملف للطباعة *"
                            value={file.printFileName || ""}
                            onChange={(e) => handleUpdateFileInfo(index, "printFileName", e.target.value)}
                            placeholder="أدخل اسم الملف"
                            required
                          />
                        </Grid>
                      </Grid>
                    </>
                  )}
                </Paper>
              );
            })}
                </Box>
              )}
      </Paper>
            </Box>
  );

  // التحقق من صلاحيات المستخدم لإنشاء التصاميم
  const canCreateDesign = user && (
    user.role === USER_ROLES.MAIN_DESIGNER || 
    user.role === USER_ROLES.ADMIN || 
    user.role === USER_ROLES.DESIGN_MANAGER
  );

  // If showFormInTab is true, render only the form
  if (showFormInTab) {
    // التحقق من صلاحيات المستخدم
    if (!canCreateDesign) {
      return (
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              غير مصرح
            </Typography>
            <Typography variant="body2">
              المستخدم غير مصرح له بإنشاء التصاميم. يجب أن تكون MainDesigner أو Admin أو DesignManager.
            </Typography>
          </Alert>
          </Box>
      );
    }
    
    return (
      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: "1.25rem" }}>
          {editingDesign ? "تعديل التصميم" : "إضافة تصميم جديد"}
        </Typography>
        {renderFormContent()}
        <Box sx={{ display: "flex", gap: 2, mt: 3, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              handleCloseDialog();
            }}
            disabled={loading}
            sx={{
              borderColor: calmPalette.primary,
              color: calmPalette.primary,
            }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
            sx={{
              backgroundColor: calmPalette.primary,
              "&:hover": {
                backgroundColor: calmPalette.primaryDark,
              },
            }}
          >
            {loading ? "جاري الحفظ..." : editingDesign ? "تحديث" : "إنشاء"}
          </Button>
        </Box>
      </Box>
    );
  }

  // Filter and sort designs
  const getFilteredAndSortedDesigns = () => {
    let filtered = [...designs];

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((design) => design.status === Number(statusFilter));
    }

    // Apply date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filterDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((design) => {
        if (!design.createdAt) return false;
        const designDate = new Date(design.createdAt);
        designDate.setHours(0, 0, 0, 0);
        return designDate.getTime() === filterDate.getTime();
      });
    }

    // Apply sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue, bValue;

        switch (sortField) {
          case "serialNumber":
            aValue = a.serialNumber || "";
            bValue = b.serialNumber || "";
            break;
          case "date":
            aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            break;
          case "status":
            aValue = a.status || 0;
            bValue = b.status || 0;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const filteredDesigns = getFilteredAndSortedDesigns();

  // If showFormInTab is true, render only the form
  if (showFormInTab) {
    // التحقق من صلاحيات المستخدم
    if (!canCreateDesign) {
      return (
        <Box sx={{ maxWidth: 900, mx: "auto" }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              غير مصرح
            </Typography>
            <Typography variant="body2">
              المستخدم غير مصرح له بإنشاء التصاميم. يجب أن تكون MainDesigner أو Admin أو DesignManager.
            </Typography>
          </Alert>
        </Box>
      );
    }
    
    return (
      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, fontSize: "1.25rem" }}>
          {editingDesign ? "تعديل التصميم" : "إضافة تصميم جديد"}
        </Typography>
        {renderFormContent()}
        <Box sx={{ display: "flex", gap: 2, mt: 3, justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              handleCloseDialog();
            }}
            disabled={loading}
            sx={{
              borderColor: calmPalette.primary,
              color: calmPalette.primary,
            }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
            sx={{
              backgroundColor: calmPalette.primary,
              "&:hover": {
                backgroundColor: calmPalette.primaryDark,
              },
            }}
          >
            {loading ? "جاري الحفظ..." : editingDesign ? "تحديث" : "إنشاء"}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          إدارة التصاميم ({filteredDesigns.length})
        </Typography>
        {!canCreateDesign && (
          <Alert severity="warning" sx={{ flex: 1, mr: 2 }}>
            أنت غير مصرح لك بإنشاء تصاميم جديدة. يجب أن تكون MainDesigner أو Admin أو DesignManager.
          </Alert>
        )}
      </Box>

      {/* Filters */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: "#ffffff",
          borderRadius: 2,
          border: `1px solid ${calmPalette.primary}15`,
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="الحالة"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              SelectProps={{
                native: true,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#ffffff",
                },
              }}
            >
              <option value="all">الكل</option>
              <option value="1">في الانتظار</option>
              <option value="2">مقبول</option>
              <option value="3">مرفوض</option>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="التاريخ"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "#ffffff",
                },
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setStatusFilter("all");
                setDateFilter("");
                setSortField(null);
                setSortDirection("asc");
              }}
              sx={{
                borderColor: calmPalette.primary + "30",
                color: calmPalette.primary,
                "&:hover": {
                  borderColor: calmPalette.primary,
                  backgroundColor: calmPalette.primary + "08",
                },
              }}
            >
              إلغاء الفلترة
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && designs.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : designs.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            borderRadius: 2,
            border: "1px solid rgba(94, 78, 62, 0.1)",
          }}
        >
          <ImageIcon
            sx={{
              fontSize: 64,
              color: calmPalette.textSecondary,
              mb: 2,
              opacity: 0.5,
            }}
          />
          <Typography variant="h6" sx={{ color: calmPalette.textPrimary, mb: 1 }}>
            لا توجد تصاميم
          </Typography>
          <Typography variant="body2" sx={{ color: calmPalette.textSecondary }}>
            ابدأ بإضافة تصميم جديد
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: calmPalette.surface }}>
                <TableCell sx={{ fontWeight: 700 }}>الصورة</TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 700,
                    cursor: "pointer",
                    userSelect: "none",
                    "&:hover": { backgroundColor: calmPalette.primary + "08" },
                  }}
                  onClick={() => handleSort("serialNumber")}
                >
                  الرقم التسلسلي {getSortIcon("serialNumber")}
                </TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 700,
                    cursor: "pointer",
                    userSelect: "none",
                    "&:hover": { backgroundColor: calmPalette.primary + "08" },
                  }}
                  onClick={() => handleSort("date")}
                >
                  تاريخ التصميم {getSortIcon("date")}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الملفات</TableCell>
                <TableCell 
                  sx={{ 
                    fontWeight: 700,
                    cursor: "pointer",
                    userSelect: "none",
                    "&:hover": { backgroundColor: calmPalette.primary + "08" },
                  }}
                  onClick={() => handleSort("status")}
                >
                  الحالة {getSortIcon("status")}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  الإجراءات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredDesigns.map((design) => (
                <TableRow
                  key={design.id}
                  sx={{
                    "&:hover": { backgroundColor: "rgba(94, 78, 62, 0.05)" },
                  }}
                >
                  <TableCell>
                    {design.designImageUrl ? (
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: 1,
                          overflow: "hidden",
                          border: "1px solid rgba(94, 78, 62, 0.2)",
                          cursor: "pointer",
                          "&:hover": {
                            opacity: 0.8,
                            transform: "scale(1.05)",
                            transition: "all 0.2s",
                          },
                        }}
                        onClick={() => handleViewDesign(design)}
                      >
                        <img
                          src={design.designImageUrl}
                          alt={design.designName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.innerHTML =
                              '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f5f5f5;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="#999"/></svg></div>';
                          }}
                        />
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: 1,
                          border: "1px dashed rgba(94, 78, 62, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "rgba(94, 78, 62, 0.05)",
                        }}
                      >
                        <ImageIcon sx={{ color: calmPalette.textSecondary, fontSize: 24 }} />
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>{design.serialNumber}</TableCell>
                  <TableCell>
                    {design.createdAt
                      ? new Date(design.createdAt).toLocaleDateString("ar-SA")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {design.designFileUrls && design.designFileUrls.length > 0 ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip
                          icon={<AttachFile />}
                          label={`${design.designFileUrls.length} ملف`}
                          size="small"
                          sx={{
                            backgroundColor: calmPalette.primary + "20",
                            color: calmPalette.primary,
                            "&:hover": {
                              backgroundColor: calmPalette.primary + "30",
                              cursor: "pointer",
                            },
                          }}
                          onClick={() => handleViewDesign(design)}
                        />
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        لا توجد ملفات
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        design.status === 1
                          ? "في الانتظار"
                          : design.status === 2
                          ? "مقبول"
                          : design.status === 3
                          ? "مرفوض"
                          : design.status === 4
                          ? "مرتجع"
                          : design.statusName || "في الانتظار"
                      }
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        ...(design.status === 2
                          ? {
                              backgroundColor: "#e8f5e9",
                              color: "#2e7d32",
                              border: "1px solid #4caf50",
                            }
                          : design.status === 3
                          ? {
                              backgroundColor: "#ffebee",
                              color: "#d32f2f",
                              border: "1px solid #f44336",
                            }
                          : design.status === 4
                          ? {
                              backgroundColor: "#e3f2fd",
                              color: "#1976d2",
                              border: "1px solid #2196f3",
                            }
                          : {
                              backgroundColor: "#fff3e0",
                              color: "#f57c00",
                              border: "1px solid #ff9800",
                            }),
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center", alignItems: "center" }}>
                      <Tooltip title="عرض">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDesign(design)}
                          sx={{ 
                            color: calmPalette.primary,
                            "&:hover": {
                              backgroundColor: `${calmPalette.primary}10`,
                            },
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      <Tooltip 
                        title={
                          design.status === 2 
                            ? "لا يمكن التعديل - التصميم مقبول" 
                            : design.status === 3 
                            ? "لا يمكن التعديل - التصميم مرفوض" 
                            : "تعديل"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (design.status === 2 || design.status === 3) {
                                Swal.fire({
                                  icon: "warning",
                                  title: "غير مسموح",
                                  text: design.status === 2 
                                    ? "لا يمكن تعديل التصميم لأنه مقبول" 
                                    : "لا يمكن تعديل التصميم لأنه مرفوض",
                                  confirmButtonColor: calmPalette.primary,
                                });
                                return;
                              }
                              handleOpenDialog(design);
                            }}
                            disabled={design.status === 2 || design.status === 3}
                            sx={{ 
                              color: design.status === 2 || design.status === 3 
                                ? "action.disabled" 
                                : calmPalette.primary,
                              "&:hover": {
                                backgroundColor: design.status === 2 || design.status === 3
                                  ? "transparent"
                                  : `${calmPalette.primary}10`,
                              },
                              "&.Mui-disabled": {
                                color: "action.disabled",
                              },
                            }}
                          >
                            <Edit />
                          </IconButton>
                        </span>
                      </Tooltip>
                       <Tooltip title={design.notes && design.notes.trim() ? "عرض الملاحظات" : "لا توجد ملاحظات"}>
                         <IconButton
                           size="small"
                           disabled={!design.notes || !design.notes.trim()}
                           onClick={() => {
                             if (design.notes && design.notes.trim()) {
                               setSelectedDesignNotes(design);
                               setNotesDialogOpen(true);
                             }
                           }}
                           sx={{ 
                             color: design.notes && design.notes.trim() ? "#8b4513" : "#9e9e9e",
                             backgroundColor: design.notes && design.notes.trim() ? "rgba(139, 69, 19, 0.15)" : "transparent",
                             "&:hover": {
                               backgroundColor: design.notes && design.notes.trim() ? "rgba(139, 69, 19, 0.25)" : "rgba(0, 0, 0, 0.04)",
                             },
                             "&.Mui-disabled": {
                               backgroundColor: "transparent",
                               color: "#9e9e9e",
                               cursor: "default",
                             },
                           }}
                         >
                           <Note />
                         </IconButton>
                       </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(design.id)}
                          sx={{ 
                            color: "error.main",
                            "&:hover": {
                              backgroundColor: "rgba(211, 47, 47, 0.1)",
                            },
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: "#ffffff",
            boxShadow: calmPalette.shadow,
            backdropFilter: "blur(8px)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 2 }}>
          {editingDesign ? "تعديل التصميم" : "إضافة تصميم جديد"}
        </DialogTitle>
        <DialogContent>
          {!canCreateDesign && !editingDesign ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                المستخدم غير مصرح له بإنشاء التصاميم. يجب أن تكون MainDesigner أو Admin أو DesignManager.
              </Typography>
            </Alert>
          ) : (
            renderFormContent()
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} disabled={loading}>
            إلغاء
          </Button>
          {(canCreateDesign || editingDesign) && (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <CheckCircle />}
            sx={{
              backgroundColor: calmPalette.primary,
              "&:hover": {
                backgroundColor: calmPalette.primaryDark,
              },
            }}
          >
            {loading ? "جاري الحفظ..." : editingDesign ? "تحديث" : "إنشاء"}
          </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* View Design Dialog */}
      <Dialog
        open={Boolean(viewingDesign)}
        onClose={() => {
          setViewingDesign(null);
          setImageUrl(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: "#ffffff",
            boxShadow: "0 8px 32px rgba(94, 78, 62, 0.12)",
            border: "none",
            overflow: "hidden",
          },
        }}
      >
        {viewingDesign && (
          <>
            <DialogTitle 
              sx={{ 
                fontWeight: 700,
                pb: 2,
                pt: 2.5,
                px: 3,
                background: "#ffffff",
                borderBottom: `1px solid ${calmPalette.primary}20`,
                fontSize: "1.1rem",
                color: calmPalette.textPrimary,
              }}
            >
              عرض التصميم
            </DialogTitle>
            <DialogContent sx={{ pt: 2.5, px: 3, pb: 2, backgroundColor: "#fafafa" }}>
              <Grid container spacing={2} sx={{ mb: 2.5 }}>
                <Grid item xs={6}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: calmPalette.textSecondary, 
                      display: "block", 
                      mb: 0.5,
                      fontSize: "0.75rem",
                    }}
                  >
                    الرقم التسلسلي
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 600, 
                      color: calmPalette.textPrimary,
                      fontSize: "0.95rem",
                    }}
                  >
                    {viewingDesign.serialNumber}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: calmPalette.textSecondary, 
                      display: "block", 
                      mb: 0.5,
                      fontSize: "0.75rem",
                    }}
                  >
                    تاريخ التصميم
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      fontWeight: 600, 
                      color: calmPalette.textPrimary,
                      fontSize: "0.95rem",
                    }}
                  >
                    {viewingDesign.createdAt
                      ? new Date(viewingDesign.createdAt).toLocaleDateString("ar-SA")
                      : viewingDesign.designDate
                      ? new Date(viewingDesign.designDate).toLocaleDateString("ar-SA")
                      : "-"}
                  </Typography>
                </Grid>
              </Grid>
              <Box sx={{ mb: 2.5 }}>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 1.5, 
                    fontWeight: 600, 
                    color: calmPalette.textPrimary,
                    fontSize: "0.9rem",
                  }}
                >
                    صورة التصميم
                  </Typography>
                {imageUrl || viewingDesign.designImageUrl ? (
                  <Box sx={{ display: "flex", gap: 1.5, justifyContent: "flex-start" }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => {
                        setSelectedImage(imageUrl || viewingDesign.designImageUrl);
                        setImageDialogOpen(true);
                      }}
                      sx={{
                        backgroundColor: calmPalette.primary,
                        color: "#ffffff",
                        px: 2,
                        py: 0.75,
                        borderRadius: 1.5,
                        fontWeight: 500,
                        textTransform: "none",
                        fontSize: "0.875rem",
                        "&:hover": {
                          backgroundColor: calmPalette.primary + "dd",
                        },
                      }}
                    >
                      عرض الصورة
                    </Button>
                      <Button
                      variant="contained"
                      size="small"
                        startIcon={<Download />}
                      onClick={async () => {
                        try {
                          const fileKey = viewingDesign.designImageKey || extractFileKeyFromUrl(viewingDesign.designImageUrl);
                          if (fileKey) {
                            await handleDownloadFile(fileKey, `design_image_${viewingDesign.serialNumber || viewingDesign.id}`);
                          } else {
                            Swal.fire({
                              icon: "error",
                              title: "خطأ",
                              text: "لا يمكن العثور على مفتاح الصورة",
                              confirmButtonColor: calmPalette.primary,
                            });
                          }
                        } catch (error) {
                          Swal.fire({
                            icon: "error",
                            title: "خطأ",
                            text: error.message || "فشل في تحميل الصورة",
                            confirmButtonColor: calmPalette.primary,
                          });
                        }
                      }}
                      sx={{ 
                        backgroundColor: calmPalette.primary,
                        color: "#ffffff",
                        px: 2,
                        py: 0.75,
                        borderRadius: 1.5,
                        fontWeight: 500,
                        textTransform: "none",
                        fontSize: "0.875rem",
                        "&:hover": {
                          backgroundColor: calmPalette.primary + "dd",
                        },
                      }}
                      >
                        تحميل الصورة
                      </Button>
                    </Box>
                  ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                      لا توجد صورة
                    </Typography>
                  )}
              </Box>
              
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 1.5, 
                    fontWeight: 600, 
                    color: calmPalette.textPrimary,
                    fontSize: "0.9rem",
                  }}
                >
                    ملفات التصميم
                  </Typography>
                  {viewingDesign.designFileUrls && viewingDesign.designFileUrls.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {viewingDesign.designFileUrls.map((fileItem, index) => {
                      // designFileUrls is now array of objects: [{ serialNumber, printFileName, fileKey, downloadUrl }]
                      let fileKey = null;
                      let fileName = `الملف ${index + 1}`;
                      let serialNumber = null;
                      let downloadUrl = null;
                      
                      if (typeof fileItem === 'object' && fileItem !== null) {
                        // New format: object with fileKey, printFileName, downloadUrl, serialNumber
                        fileKey = fileItem.fileKey;
                        fileName = fileItem.printFileName || fileName;
                        serialNumber = fileItem.serialNumber;
                        downloadUrl = fileItem.downloadUrl;
                      } else if (typeof fileItem === 'string') {
                        // Legacy format: string URL
                        fileKey = extractFileKeyFromUrl(fileItem) || fileItem;
                        downloadUrl = fileItem;
                      }
                      
                      return (
                        <Box
                          key={index}
                          sx={{
                            p: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            backgroundColor: "#ffffff",
                            borderRadius: 1.5,
                            border: `1px solid ${calmPalette.primary}20`,
                            "&:hover": {
                              borderColor: calmPalette.primary + "40",
                              boxShadow: "0 2px 4px rgba(94, 78, 62, 0.08)",
                            },
                            transition: "all 0.2s ease",
                          }}
                        >
                          <AttachFile sx={{ color: calmPalette.primary, fontSize: 20 }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {serialNumber && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  color: calmPalette.textSecondary, 
                                  display: "block", 
                                  mb: 0.25,
                                  fontSize: "0.7rem",
                                }}
                              >
                                الرقم: {serialNumber}
                              </Typography>
                            )}
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 500, 
                                color: calmPalette.textPrimary,
                                fontSize: "0.85rem",
                                wordBreak: "break-word",
                              }}
                            >
                              {fileName}
                            </Typography>
                          </Box>
                          <Button
                          startIcon={<Download />}
                            onClick={() => {
                              if (downloadUrl) {
                                const link = document.createElement('a');
                                link.href = downloadUrl;
                                link.download = fileName;
                                link.target = '_blank';
                                link.style.display = 'none';
                                document.body.appendChild(link);
                                link.click();
                                setTimeout(() => {
                                  document.body.removeChild(link);
                                }, 100);
                              } else if (fileKey) {
                                handleDownloadFile(fileKey, fileName);
                              }
                            }}
                          variant="outlined"
                            size="small"
                          sx={{
                              minWidth: 90,
                              borderColor: calmPalette.primary + "30",
                            color: calmPalette.primary,
                              backgroundColor: "#ffffff",
                              fontSize: "0.8rem",
                              textTransform: "none",
                              borderRadius: 1.5,
                              px: 1.5,
                              "&:hover": {
                                borderColor: calmPalette.primary,
                                backgroundColor: calmPalette.primary + "08",
                              },
                            }}
                          >
                            تحميل
                        </Button>
                        </Box>
                      );
                    })}
                    </Box>
                  ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 1, textAlign: "center" }}>
                      لا توجد ملفات
                    </Typography>
                  )}
              </Box>
            </DialogContent>
            <DialogActions sx={{ 
              px: 3, 
              py: 2, 
              borderTop: `1px solid ${calmPalette.primary}20`, 
              backgroundColor: "#ffffff",
            }}>
              <Button 
                onClick={() => {
                  setViewingDesign(null);
                  setImageUrl(null);
                }}
                variant="outlined"
                size="small"
                sx={{
                  color: calmPalette.textPrimary,
                  borderColor: calmPalette.primary + "30",
                  backgroundColor: "#ffffff",
                  px: 2.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  fontWeight: 500,
                  textTransform: "none",
                  fontSize: "0.875rem",
                  "&:hover": {
                    borderColor: calmPalette.primary,
                    backgroundColor: calmPalette.primary + "08",
                  },
                }}
              >
                إغلاق
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Image View Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: "#ffffff",
            boxShadow: calmPalette.shadow,
            border: "1px solid rgba(94, 78, 62, 0.15)",
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            fontWeight: 700,
            pb: 1.5,
            pt: 2,
            px: 2.5,
            background: "#ffffff",
            borderBottom: `1px solid ${calmPalette.primary}20`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          عرض الصورة
          <IconButton
            onClick={() => setImageDialogOpen(false)}
            size="small"
            sx={{
              color: calmPalette.textSecondary,
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, px: 2.5, pb: 2, backgroundColor: "#ffffff" }}>
          {selectedImage && (
            <Box sx={{ textAlign: "center" }}>
              <img
                src={selectedImage}
                alt="صورة التصميم"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  borderRadius: 8,
                }}
                onError={(e) => {
                  e.target.src = "/placeholder.png";
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog
        open={notesDialogOpen}
        onClose={() => {
          setNotesDialogOpen(false);
          setSelectedDesignNotes(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          },
        }}
      >
        <DialogTitle
          sx={{
            backgroundColor: calmPalette.primary + "10",
            borderBottom: `1px solid ${calmPalette.primary}20`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            py: 2,
          }}
        >
          <Note sx={{ color: calmPalette.primary, fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: calmPalette.textPrimary }}>
            ملاحظات التصميم
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedDesignNotes && (
            <Box>
              <Box sx={{ mb: 2, p: 2, backgroundColor: calmPalette.primary + "05", borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mb: 0.5 }}>
                  الرقم التسلسلي:
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600, color: calmPalette.textPrimary }}>
                  {selectedDesignNotes.serialNumber}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: calmPalette.textSecondary, mb: 1, fontWeight: 600 }}>
                  الملاحظات:
                </Typography>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: "#ffffff",
                    border: `1px solid ${calmPalette.primary}20`,
                    borderRadius: 2,
                    minHeight: 100,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      color: calmPalette.textPrimary,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.8,
                    }}
                  >
                    {selectedDesignNotes.notes}
                  </Typography>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${calmPalette.primary}10` }}>
          <Button
            onClick={() => {
              setNotesDialogOpen(false);
              setSelectedDesignNotes(null);
            }}
            variant="contained"
            sx={{
              backgroundColor: calmPalette.primary,
              "&:hover": {
                backgroundColor: calmPalette.primaryDark,
              },
            }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Change Toasts - Persistent (Multiple) */}
      {statusChangeToasts.map((toast, index) => (
        <Box
          key={toast.id}
          sx={{
            position: "fixed",
            top: `${20 + (index * 80)}px`,
            left: "20px",
            zIndex: 9999,
            minWidth: 300,
            maxWidth: 350,
          }}
        >
          <Alert
            onClose={() => {
              setStatusChangeToasts(prev => prev.filter(t => t.id !== toast.id));
            }}
            severity="info"
            variant="outlined"
            icon={false}
            sx={{
              width: "100%",
              direction: "rtl",
              textAlign: "right",
              backgroundColor: "#ffffff",
              border: "1.5px solid #9e9e9e",
              color: "#212121",
              py: 1.2,
              px: 1.5,
              boxShadow: "0 3px 10px rgba(0, 0, 0, 0.15)",
              borderRadius: 2,
              "& .MuiAlert-message": {
                width: "100%",
                padding: 0,
              },
              "& .MuiAlert-action": {
                paddingLeft: 0,
                paddingRight: 0,
                marginRight: 0.5,
                "& .MuiIconButton-root": {
                  color: "#616161",
                  padding: 0.5,
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.08)",
                  },
                },
              },
            }}
          >
            <Typography variant="body2" sx={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#212121", fontWeight: 500 }}>
              تم تغيير حالة التصميم {toast.serialNumber} إلى {toast.newStatus}
            </Typography>
          </Alert>
        </Box>
      ))}
    </Box>
  );
};

export default DesignsManagement;

