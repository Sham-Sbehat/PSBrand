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
} from "@mui/icons-material";
import { mainDesignerService } from "../../services/api";
import Swal from "sweetalert2";
import calmPalette from "../../theme/calmPalette";

const DesignsManagement = () => {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingDesign, setEditingDesign] = useState(null);
  const [viewingDesign, setViewingDesign] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [formData, setFormData] = useState({
    serialNumber: "",
    designName: "",
    designDate: new Date().toISOString().split("T")[0],
    designImageKey: "",
    designFileKeys: [], // Array of objects: [{ serialNumber, printFileName, fileKey }]
  });
  const [uploadedFiles, setUploadedFiles] = useState({
    image: null,
    files: [], // Array of objects: [{ name, key, serialNumber, printFileName }]
  });

  useEffect(() => {
    loadDesigns();
  }, []);

  const loadDesigns = async () => {
    setLoading(true);
    try {
      const data = await mainDesignerService.getDesigns();
      setDesigns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading designs:", error);
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
      
      setFormData({
        serialNumber: design.serialNumber || "",
        designName: design.designName || "",
        designDate: design.designDate ? design.designDate.split("T")[0] : new Date().toISOString().split("T")[0],
        designImageKey: design.designImageKey || "",
        designFileKeys: fileKeys,
      });
      
      // Set uploaded files for display
      setUploadedFiles({
        image: design.designImageKey ? { name: design.designName || "صورة", key: design.designImageKey } : null,
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
        designName: "",
        designDate: new Date().toISOString().split("T")[0],
        designImageKey: "",
        designFileKeys: [],
      });
      setUploadedFiles({ image: null, files: [] });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
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
      setUploadingFiles((prev) => [...prev, file.name]);
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

      // Step 1: Generate upload URL
      const contentType = isPSD ? "application/octet-stream" : file.type;
      const folder = type === "image" ? "designs/images" : "designs/files";
      
      console.log("📤 Requesting upload URL:", { fileName: file.name, fileSize: file.size, contentType, folder });
      
      const uploadData = await mainDesignerService.generateUploadUrl(
        file.name,
        file.size,
        contentType,
        folder
      );

      console.log("✅ Received upload data:", uploadData);

      if (!uploadData.uploadUrl || !uploadData.fileKey) {
        throw new Error("فشل في الحصول على رابط الرفع");
      }

      // Step 2: Upload file directly to R2 using Presigned URL
      // The backend expects the file to be uploaded to R2 before confirming
      console.log("📤 Uploading file to R2:", uploadData.uploadUrl.substring(0, 100) + "...");
      console.log("📋 File details:", { name: file.name, size: file.size, type: contentType });
      
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
        
        console.log("📥 Upload response status:", uploadResponse.status);
        console.log("📥 Upload response headers:", Object.fromEntries(uploadResponse.headers.entries()));

        if (!uploadResponse.ok) {
          let errorMessage = `فشل في رفع الملف (${uploadResponse.status})`;
          try {
            const errorText = await uploadResponse.text();
            if (errorText) {
              console.error("❌ Upload error response:", errorText);
              errorMessage += `: ${errorText}`;
            }
          } catch (e) {
            console.error("❌ Upload error:", uploadResponse.status, uploadResponse.statusText);
          }
          throw new Error(errorMessage);
        }
        
        console.log("✅ File uploaded successfully to R2");
      } catch (uploadError) {
        console.error("❌ Upload failed:", uploadError);
        
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
      console.log("✅ Confirming upload:", { 
        fileKey: uploadData.fileKey, 
        fileSize: file.size, 
        contentType,
        fullFileKey: uploadData.fileKey 
      });
      
      try {
        const confirmResult = await mainDesignerService.confirmFileUpload(
          uploadData.fileKey,
          file.size,
          contentType
        );
        
        console.log("✅ Upload confirmed successfully:", confirmResult);
      } catch (confirmError) {
        console.error("❌ Confirm upload failed:", confirmError);
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
        console.log("💾 Saving image key to form:", uploadData.fileKey);
        setFormData((prev) => {
          const updated = { ...prev, designImageKey: uploadData.fileKey };
          console.log("💾 Updated formData:", updated);
          return updated;
        });
        setUploadedFiles((prev) => ({ ...prev, image: { name: file.name, key: uploadData.fileKey } }));
      } else {
        // For files, create object with serialNumber and printFileName (empty initially, user will fill)
        const newFileObject = {
          serialNumber: "",
          printFileName: file.name,
          fileKey: uploadData.fileKey,
        };
        
        console.log("💾 Saving file key to form:", newFileObject);
        setFormData((prev) => {
          const updated = {
            ...prev,
            designFileKeys: [...prev.designFileKeys, newFileObject],
          };
          console.log("💾 Updated formData:", updated);
          return updated;
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

      setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
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
      console.error("Error uploading file:", error);
      setUploadingFiles((prev) => prev.filter((name) => name !== file.name));
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[file.name];
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
    if (!formData.serialNumber || !formData.designName || !formData.designDate) {
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
        designName: formData.designName,
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
      
      console.log("📤 Sending design data:", designPayload);
      console.log("📤 DesignImageKey value:", designPayload.designImageKey);
      console.log("📤 DesignFileKeys:", designPayload.designFileKeys);
      
      if (editingDesign) {
        await mainDesignerService.updateDesign(editingDesign.id, designPayload);
        Swal.fire({
          icon: "success",
          title: "تم التحديث بنجاح",
          text: "تم تحديث التصميم بنجاح",
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
      console.error("Error saving design:", error);
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
        console.error("Error deleting design:", error);
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
          console.error("Error generating image URL:", error);
          setImageUrl(fullDesign.designImageUrl);
        }
      } else {
        setImageUrl(null);
      }
    } catch (error) {
      console.error("Error loading design:", error);
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

      // استخدام API لتوليد download URL
      const downloadData = await mainDesignerService.generateDownloadUrl(fileKey);
      if (downloadData.downloadUrl) {
        window.open(downloadData.downloadUrl, "_blank");
      } else {
        throw new Error("فشل في توليد رابط التحميل");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      Swal.fire({
        icon: "error",
        title: "خطأ",
        text: error.response?.data?.message || error.message || "فشل في تحميل الملف",
        confirmButtonColor: calmPalette.primary,
      });
    }
  };

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
          إدارة التصاميم ({designs.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{
            backgroundColor: calmPalette.primary,
            "&:hover": {
              backgroundColor: calmPalette.primaryDark,
            },
          }}
        >
          إضافة تصميم
        </Button>
      </Box>

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
                <TableCell sx={{ fontWeight: 700 }}>الرقم التسلسلي</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>اسم التصميم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ التصميم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الملفات</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">
                  الإجراءات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {designs.map((design) => (
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
                  <TableCell>{design.designName}</TableCell>
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
                      label={design.statusName || design.status || "في الانتظار"}
                      color={
                        design.statusName === "نشط" || design.status === 1
                          ? "success"
                          : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDesign(design)}
                        sx={{ color: calmPalette.primary }}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(design)}
                        sx={{ color: calmPalette.primary }}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(design.id)}
                        sx={{ color: "error.main" }}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
            <TextField
              fullWidth
              label="الرقم التسلسلي *"
              value={formData.serialNumber}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))
              }
              required
            />

            <TextField
              fullWidth
              label="اسم التصميم *"
              value={formData.designName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, designName: e.target.value }))
              }
              required
            />

            <TextField
              fullWidth
              type="date"
              label="تاريخ التصميم *"
              value={formData.designDate}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, designDate: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              required
            />

            {/* Image Upload */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
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
              {uploadingFiles.some((name) => {
                // Check if image is being uploaded (not in uploadedFiles yet)
                return name.includes("image") || 
                  (uploadedFiles.image && name === uploadedFiles.image.name);
              }) && !uploadedFiles.image ? (
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
                    border: uploadingFiles.includes(uploadedFiles.image.name) 
                      ? "1px solid rgba(94, 78, 62, 0.2)" 
                      : "1px solid rgba(94, 78, 62, 0.1)",
                    opacity: uploadingFiles.includes(uploadedFiles.image.name) ? 0.7 : 1,
                  }}
                >
                  {uploadingFiles.includes(uploadedFiles.image.name) ? (
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
            </Box>

            {/* Files Upload */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
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
              {uploadingFiles.filter((name) => {
                // Check if this file is being uploaded (not in uploadedFiles yet)
                // Exclude image files (they have their own section)
                return !name.includes("image") && !uploadedFiles.files.some((f) => f.name === name);
              }).map((uploadingFileName, uploadIndex) => (
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
                      جاري رفع: {uploadingFileName}
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
                    const isUploading = uploadingFiles.includes(file.name);
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
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDialog} disabled={loading}>
            إلغاء
          </Button>
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
        </DialogActions>
      </Dialog>

      {/* View Design Dialog */}
      <Dialog
        open={Boolean(viewingDesign)}
        onClose={() => {
          setViewingDesign(null);
          setImageUrl(null);
        }}
        maxWidth="lg"
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
        {viewingDesign && (
          <>
            <DialogTitle sx={{ fontWeight: 700, pb: 2 }}>
              عرض التصميم: {viewingDesign.designName}
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    الرقم التسلسلي
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {viewingDesign.serialNumber}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    تاريخ التصميم
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {viewingDesign.designDate
                      ? new Date(viewingDesign.designDate).toLocaleDateString("ar-SA")
                      : "-"}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    صورة التصميم
                  </Typography>
                  {imageUrl || viewingDesign.designImageUrl ? (
                    <Box
                      sx={{
                        mt: 1,
                        p: 2,
                        backgroundColor: "rgba(94, 78, 62, 0.05)",
                        borderRadius: 2,
                        textAlign: "center",
                      }}
                    >
                      <img
                        src={imageUrl || viewingDesign.designImageUrl}
                        alt={viewingDesign.designName}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "400px",
                          borderRadius: 8,
                        }}
                        onError={(e) => {
                          // إذا فشل تحميل الصورة من API، جرب الـ URL الأصلي
                          if (imageUrl && imageUrl !== viewingDesign.designImageUrl) {
                            e.target.src = viewingDesign.designImageUrl;
                          }
                        }}
                      />
                      <Button
                        startIcon={<Download />}
                        onClick={() =>
                          handleDownloadFile(
                            viewingDesign.designImageKey || viewingDesign.designImageUrl,
                            `${viewingDesign.designName}_image`
                          )
                        }
                        sx={{ mt: 2 }}
                      >
                        تحميل الصورة
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد صورة
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                    ملفات التصميم
                  </Typography>
                  {viewingDesign.designFileUrls && viewingDesign.designFileUrls.length > 0 ? (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {viewingDesign.designFileUrls.map((fileItem, index) => {
                        // designFileUrls is now array of objects: [{ serialNumber, printFileName, fileKey, downloadUrl }]
                        let fileKey = null;
                        let fileName = `الملف ${index + 1}`;
                        let downloadUrl = null;
                        
                        if (typeof fileItem === 'object' && fileItem !== null) {
                          // New format: object with fileKey, printFileName, downloadUrl
                          fileKey = fileItem.fileKey;
                          fileName = fileItem.printFileName || fileName;
                          downloadUrl = fileItem.downloadUrl;
                        } else if (typeof fileItem === 'string') {
                          // Legacy format: string URL
                          fileKey = extractFileKeyFromUrl(fileItem) || fileItem;
                          downloadUrl = fileItem;
                        }
                        
                        return (
                          <Button
                            key={index}
                            startIcon={<Download />}
                            onClick={() => {
                              if (downloadUrl) {
                                // Use downloadUrl directly if available
                                window.open(downloadUrl, "_blank");
                              } else if (fileKey) {
                                // Otherwise generate download URL
                                handleDownloadFile(fileKey, fileName);
                              }
                            }}
                            variant="outlined"
                            fullWidth
                            sx={{
                              justifyContent: "flex-start",
                              borderColor: calmPalette.primary,
                              color: calmPalette.primary,
                            }}
                          >
                            تحميل {fileName}
                          </Button>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد ملفات
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              <Button onClick={() => setViewingDesign(null)}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default DesignsManagement;

