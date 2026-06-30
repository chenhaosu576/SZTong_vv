// useAppointmentUpload.js
// 预约页的图片上传临时态。
// 持有 fileInputRef / itemImage / itemImageName,提供触发选择 / 监听变更 / 清除。
// 上传不持久化、不入 form;提交时由 useAppointmentForm.handleSubmit 读取
// useAppointmentUpload().itemImage.value 临时使用。
//
// 使用方: AppointmentItemSection 在 setup() 里调用。

import { ref } from "vue";

export function useAppointmentUpload() {
  // template ref,指向隐藏的 <input type="file">
  const fileInputRef = ref(null);

  // 当前选中的文件 / 文件名
  const itemImage = ref(null);
  const itemImageName = ref("");

  function triggerFileSelect() {
    fileInputRef.value?.click();
  }

  function handleFileChange(event) {
    const [file] = event.target.files || [];
    itemImage.value = file || null;
    itemImageName.value = file ? file.name : "";
  }

  function clearSelectedFile() {
    itemImage.value = null;
    itemImageName.value = "";
    if (fileInputRef.value) {
      fileInputRef.value.value = "";
    }
  }

  return {
    fileInputRef,
    itemImage,
    itemImageName,
    triggerFileSelect,
    handleFileChange,
    clearSelectedFile,
  };
}