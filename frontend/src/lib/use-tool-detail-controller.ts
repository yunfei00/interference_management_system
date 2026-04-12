"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { UploadState } from "@/lib/tool-upload";
import type {
  ToolDetailPageModel,
  ToolSummaryModel,
  ToolUpdateInput,
  ToolVersionCreateInput,
  ToolVersionModel,
} from "@/lib/tool-detail-service";
import {
  createToolVersion,
  deleteTool,
  deleteVersion,
  fetchToolDetailPage,
  setCurrentVersion,
  updateTool,
} from "@/lib/tool-detail-service";

type ActionPanel = "upload" | "edit" | null;
type FeedbackTone = "success" | "error";

type FeedbackState = {
  tone: FeedbackTone;
  message: string;
} | null;

const EMPTY_UPLOAD_STATE: UploadState = {
  status: "waiting",
  uploadId: null,
  uploadedChunks: 0,
  totalChunks: 0,
  progress: 0,
  error: null,
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "操作失败，请稍后重试。";
}

function buildEditForm(tool: ToolSummaryModel): ToolUpdateInput {
  return {
    name: tool.name,
    code: tool.code,
    category: tool.category,
    department: tool.department,
    summary: tool.summary,
    detail: tool.detail,
    status: tool.status,
    icon: tool.icon,
    tags: tool.tags.join(", "),
  };
}

function emptyVersionForm(): ToolVersionCreateInput {
  return {
    version: "",
    release_notes: "",
    changelog: "",
    file: null,
  };
}

export function useToolDetailController(args: {
  toolId: string;
  enabled: boolean;
}) {
  const { toolId, enabled } = args;
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageData, setPageData] = useState<ToolDetailPageModel | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [activePanel, setActivePanel] = useState<ActionPanel>(null);
  const [uploadState, setUploadState] = useState<UploadState>(EMPTY_UPLOAD_STATE);
  const [editForm, setEditForm] = useState<ToolUpdateInput | null>(null);
  const [versionForm, setVersionForm] = useState<ToolVersionCreateInput>(emptyVersionForm);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      if (!enabled || !toolId) {
        return;
      }

      setStatus("loading");
      setErrorMessage(null);

      try {
        const next = await fetchToolDetailPage(toolId);
        if (cancelled) {
          return;
        }
        setPageData(next);
        setEditForm(buildEditForm(next.tool));
        setStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }
        setErrorMessage(toErrorMessage(error));
        setStatus("error");
      }
    }

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, [enabled, toolId]);

  async function refresh() {
    if (!enabled || !toolId) {
      return;
    }

    setRefreshing(true);
    try {
      const next = await fetchToolDetailPage(toolId);
      setPageData(next);
      setEditForm(buildEditForm(next.tool));
      setStatus("ready");
      setErrorMessage(null);
    } catch (error) {
      const message = toErrorMessage(error);
      if (!pageData) {
        setStatus("error");
        setErrorMessage(message);
      } else {
        setFeedback({ tone: "error", message });
      }
    } finally {
      setRefreshing(false);
    }
  }

  function openPanel(panel: Exclude<ActionPanel, null>) {
    setActivePanel((current) => {
      if (current === panel) {
        return null;
      }
      return panel;
    });

    if (panel === "upload") {
      setVersionForm(emptyVersionForm());
      setUploadState(EMPTY_UPLOAD_STATE);
    }

    if (panel === "edit" && pageData) {
      setEditForm(buildEditForm(pageData.tool));
    }
  }

  function closePanel() {
    setActivePanel(null);
  }

  function updateEditField<K extends keyof ToolUpdateInput>(
    key: K,
    value: ToolUpdateInput[K],
  ) {
    setEditForm((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        [key]: value,
      };
    });
  }

  function updateVersionField<K extends keyof ToolVersionCreateInput>(
    key: K,
    value: ToolVersionCreateInput[K],
  ) {
    setVersionForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submitEdit() {
    if (!editForm) {
      return;
    }

    setBusyAction("edit");
    setFeedback(null);

    try {
      await updateTool(toolId, editForm);
      await refresh();
      setActivePanel(null);
      setFeedback({ tone: "success", message: "工具信息已更新。" });
    } catch (error) {
      setFeedback({ tone: "error", message: toErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function submitVersion() {
    if (!versionForm.version.trim()) {
      setFeedback({ tone: "error", message: "请填写版本号。" });
      return;
    }

    if (!versionForm.file) {
      setFeedback({ tone: "error", message: "请选择要上传的安装包文件。" });
      return;
    }

    setBusyAction("upload");
    setFeedback(null);
    setUploadState(EMPTY_UPLOAD_STATE);

    try {
      await createToolVersion({
        toolId,
        values: versionForm,
        existingVersionIds: new Set(pageData?.versions.map((row) => row.id) ?? []),
        onUploadState: setUploadState,
      });
      await refresh();
      setVersionForm(emptyVersionForm());
      setUploadState(EMPTY_UPLOAD_STATE);
      setActivePanel(null);
      setFeedback({ tone: "success", message: "新版本已成功上传。" });
    } catch (error) {
      setFeedback({ tone: "error", message: toErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteTool() {
    if (!pageData) {
      return;
    }

    const confirmed = window.confirm(
      `确定要删除工具「${pageData.tool.name}」及其全部版本吗？`,
    );
    if (!confirmed) {
      return;
    }

    setBusyAction("delete-tool");
    setFeedback(null);

    try {
      await deleteTool(toolId);
      router.push("/dashboard/electromagnetic/interference/tools");
    } catch (error) {
      setFeedback({ tone: "error", message: toErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteVersion(version: ToolVersionModel) {
    const confirmed = window.confirm(`确定要删除版本 ${version.version} 吗？`);
    if (!confirmed) {
      return;
    }

    setBusyAction(`delete-version-${version.id}`);
    setFeedback(null);

    try {
      await deleteVersion(version.id);
      await refresh();
      setFeedback({ tone: "success", message: `已删除版本 ${version.version}。` });
    } catch (error) {
      setFeedback({ tone: "error", message: toErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSetCurrent(version: ToolVersionModel) {
    setBusyAction(`set-current-${version.id}`);
    setFeedback(null);

    try {
      await setCurrentVersion(version.id);
      await refresh();
      setFeedback({ tone: "success", message: `已将 ${version.version} 设为当前版本。` });
    } catch (error) {
      setFeedback({ tone: "error", message: toErrorMessage(error) });
    } finally {
      setBusyAction(null);
    }
  }

  return {
    status,
    errorMessage,
    data: pageData,
    refreshing,
    busyAction,
    feedback,
    activePanel,
    uploadState,
    editForm,
    versionForm,
    openPanel,
    closePanel,
    refresh,
    updateEditField,
    updateVersionField,
    submitEdit,
    submitVersion,
    handleDeleteTool,
    handleDeleteVersion,
    handleSetCurrent,
  };
}
