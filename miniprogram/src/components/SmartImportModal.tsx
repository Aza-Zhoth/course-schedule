import { Input, Picker, Text, Textarea, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEffect, useMemo, useState } from 'react';
import { LIMITS, WEEKDAYS, WEEK_PARITY_OPTIONS } from '../constants';
import type { Course, CourseDraft, SectionTime } from '../types';
import { clamp } from '../utils/date';
import { assignColorsByCourseName } from '../utils/course';
import { looksLikeJson, parseScheduleText, type ParsedCourse } from '../utils/importParser';
import { CloseIcon, SparkleIcon, TrashIcon } from './Icons';

interface SmartImportModalProps {
  open: boolean;
  totalWeeks: number;
  maxSections: number;
  sections: SectionTime[];
  existingCourses: Course[];
  onImport: (drafts: CourseDraft[]) => number;
  onClose: () => void;
}

interface PreviewRow {
  key: number;
  selected: boolean;
  draft: CourseDraft;
  issues: string[];
  source: string;
  duplicate: boolean;
}

/**
 * 智能导入弹窗（需求文档 §3.4 F12）。
 *
 * 两步流程：粘贴文字 → 解析 → 预览核对 → 批量导入。
 * 关键设计：解析器的输出永远先过一遍「人」，预览里每一行都可以改、可以不勾，
 * 「识别不准」不会造成脏数据 —— 这是不引入云端 OCR / LLM 的前提下，
 * 保证导入可靠性的唯一正确姿势。
 */
export function SmartImportModal({
  open,
  totalWeeks,
  maxSections,
  sections,
  existingCourses,
  onImport,
  onClose,
}: SmartImportModalProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [showUnmatched, setShowUnmatched] = useState(false);

  // 每次打开都回到输入步、清空上一次的残留
  useEffect(() => {
    if (!open) return;
    setStep('input');
    setText('');
    setRows([]);
    setUnmatched([]);
    setShowUnmatched(false);
  }, [open]);

  // 迁移说明：H5 版用 window.addEventListener('keydown') 监听 Esc 关窗，
  // 小程序没有物理键盘也没有 window，这段整块删掉了。

  const isDuplicate = (draft: CourseDraft) =>
    existingCourses.some(
      (course) =>
        course.name === draft.name &&
        course.dayOfWeek === draft.dayOfWeek &&
        course.startSection === draft.startSection &&
        course.endSection === draft.endSection &&
        course.startWeek === draft.startWeek,
    );

  const handleParse = () => {
    if (!text.trim()) return;

    if (looksLikeJson(text)) {
      setStep('input');
      return;
    }

    const result = parseScheduleText(text, { maxSections, totalWeeks });
    if (result.courses.length === 0) {
      setUnmatched(result.unmatched);
      setRows([]);
      setStep('preview');
      return;
    }

    setRows(
      result.courses.map((item: ParsedCourse, index) => ({
        key: index,
        selected: true,
        draft: { ...item.draft },
        issues: item.issues,
        source: item.source,
        duplicate: isDuplicate(item.draft),
      })),
    );
    setUnmatched(result.unmatched);
    setStep('preview');
  };

  const patchRow = (key: number, patch: Partial<CourseDraft>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const draft = { ...row.draft, ...patch };
        return { ...row, draft, duplicate: isDuplicate(draft) };
      }),
    );
  };

  const toggleRow = (key: number) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, selected: !row.selected } : row)));
  };

  const removeRow = (key: number) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const selectedRows = useMemo(() => rows.filter((row) => row.selected), [rows]);
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  const handleImport = () => {
    // 颜色按课程名分配：同一门课的多条记录（不同周次段/单双周）共享一色
    const drafts = assignColorsByCourseName(
      selectedRows.map((row) => ({
        ...row.draft,
        name: row.draft.name.trim(),
        teacher: row.draft.teacher.trim(),
        location: row.draft.location.trim(),
        note: row.draft.note?.trim() || undefined,
      })),
    );
    if (drafts.length === 0) return;
    onImport(drafts);
    onClose();
  };

  if (!open) return null;

  // Picker 的候选列表。注意 Picker 的 value 是「第几项」而不是「选项的值」，
  // 下面每处都做了下标换算，否则选出来的星期/节次会整体错位。
  const weekdayLabels = WEEKDAYS.map((day) => day.label);
  const sectionLabels = sections.map((section) => `第${section.index}节`);
  const parityLabels = WEEK_PARITY_OPTIONS.map((option) => option.label);

  return (
    <View className="modal">
      <View className="modal__mask" onClick={onClose} />

      <View className="modal__sheet modal__sheet--wide" aria-label="智能导入">
        <View className="modal__head">
          <View className="modal__title">
            <SparkleIcon size={16} />
            <Text>智能导入</Text>
          </View>
          <View className="modal__close" onClick={onClose} aria-label="关闭">
            <CloseIcon size={17} />
          </View>
        </View>

        <View className="modal__body">
          {step === 'input' ? (
            <View>
              <Text className="modal__hint">
                粘贴课表文字（教务系统复制的、或从截图提取的），我来抽取星期、节次、周次、地点和教师。
                识别结果会先给你核对，确认后才会写入课程库。
              </Text>

              {/* 迁移说明：<textarea> 换成 Taro 的 Textarea。
                  小程序没有 rows 属性，高度改用 style 指定；
                  maxlength 传 -1 表示不限制长度（课表原文可能有几百行）。 */}
              <Textarea
                className="import-textarea"
                value={text}
                maxlength={-1}
                placeholder={'示例（每行一门课，或多行一段都行）：\n高等数学 周一 第1-2节 1-16周 教301 张老师\n数据结构(1-16周) 星期三 第5,6节 实验楼402 王老师'}
                onInput={(event) => setText(event.detail.value)}
                style={{ height: Taro.pxTransform(150) }}
              />

              {looksLikeJson(text) && (
                <Text className="field__error">检测到这是应用导出的 JSON 备份，请到「我的 → 导入数据」使用，不要走文字解析。</Text>
              )}

              <View className="import-tip">
                <View className="import-tip__title"><Text>有一张课表图片？三步变文字：</Text></View>
                <View className="import-tip__steps">
                  <View>
                    <Text>微信（或手机相册）打开图片，长按 →「提取文字」</Text>
                  </View>
                  <View>
                    <Text>全选复制</Text>
                  </View>
                  <View>
                    <Text>回来粘贴，点「开始解析」</Text>
                  </View>
                </View>
                <View className="import-tip__note">
                  <Text>
                    微信自带的文字提取对中文截图的识别质量，普遍好于浏览器端离线 OCR，所以图片入口走「先提取、再粘贴」，不装额外引擎。
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View>
              <Text className="modal__hint">
                识别出 {rows.length} 条课程信息
                {unmatched.length > 0 ? `，另有 ${unmatched.length} 行没认出来（见底部）` : ''}
                。请核对每一行：字段可改，不想要的取消勾选。
              </Text>

              {/* 迁移说明：原先是原生 checkbox，小程序的自定义勾选框统一用 View + 类名实现 */}
              <View
                className="import-all"
                onClick={() => setRows((prev) => prev.map((row) => ({ ...row, selected: !allSelected })))}
              >
                <View className={`checkbox${allSelected ? ' checkbox--on' : ''}`} />
                <Text>全选 / 全不选</Text>
              </View>

              <View className="preview-list">
                {rows.map((row) => {
                  const weekdayIndex = Math.max(
                    0,
                    WEEKDAYS.findIndex((day) => day.value === row.draft.dayOfWeek),
                  );
                  const parityIndex = Math.max(
                    0,
                    WEEK_PARITY_OPTIONS.findIndex((option) => option.value === row.draft.weekParity),
                  );

                  return (
                    <View key={row.key} className={`preview-row${row.selected ? '' : ' preview-row--off'}`}>
                      <View className="preview-row__head">
                        <View className="preview-row__check">
                          <View
                            className={`checkbox${row.selected ? ' checkbox--on' : ''}`}
                            onClick={() => toggleRow(row.key)}
                          />
                          <Text className="preview-row__source">
                            {row.source.slice(0, 44)}{row.source.length > 44 ? '…' : ''}
                          </Text>
                        </View>
                        <View
                          className="icon-btn icon-btn--soft icon-btn--danger"
                          onClick={() => removeRow(row.key)}
                          aria-label="移除这一条"
                        >
                          <TrashIcon size={14} />
                        </View>
                      </View>

                      <View className="preview-row__grid">
                        <Input
                          className="field__input preview-row__name"
                          value={row.draft.name}
                          maxlength={LIMITS.NAME_MAX}
                          onInput={(event) => patchRow(row.key, { name: event.detail.value })}
                        />
                        <Input
                          className="field__input"
                          value={row.draft.teacher}
                          maxlength={LIMITS.TEACHER_MAX}
                          placeholderClass="input-placeholder"
                          placeholder="教师"
                          onInput={(event) => patchRow(row.key, { teacher: event.detail.value })}
                        />
                        <Input
                          className="field__input"
                          value={row.draft.location}
                          maxlength={LIMITS.LOCATION_MAX}
                          placeholderClass="input-placeholder"
                          placeholder="地点"
                          onInput={(event) => patchRow(row.key, { location: event.detail.value })}
                        />

                        <Picker
                          mode="selector"
                          range={weekdayLabels}
                          value={weekdayIndex}
                          onChange={(event) => {
                            const day = WEEKDAYS[Number(event.detail.value)];
                            if (day) patchRow(row.key, { dayOfWeek: day.value });
                          }}
                        >
                          <View className="field__select"><Text>{weekdayLabels[weekdayIndex]}</Text></View>
                        </Picker>

                        <Picker
                          mode="selector"
                          range={sectionLabels}
                          value={Math.max(0, row.draft.startSection - 1)}
                          onChange={(event) => {
                            const next = clamp(Number(event.detail.value) + 1, 1, maxSections);
                            patchRow(
                              row.key,
                              next > row.draft.endSection
                                ? { startSection: next, endSection: next }
                                : { startSection: next },
                            );
                          }}
                        >
                          <View className="field__select"><Text>第{row.draft.startSection}节</Text></View>
                        </Picker>

                        <Picker
                          mode="selector"
                          range={sectionLabels}
                          value={Math.max(0, row.draft.endSection - 1)}
                          onChange={(event) => {
                            const next = clamp(Number(event.detail.value) + 1, 1, maxSections);
                            patchRow(
                              row.key,
                              next < row.draft.startSection
                                ? { endSection: next, startSection: next }
                                : { endSection: next },
                            );
                          }}
                        >
                          <View className="field__select"><Text>到第{row.draft.endSection}节</Text></View>
                        </Picker>

                        <Input
                          className="field__input"
                          type="number"
                          value={String(row.draft.startWeek)}
                          onInput={(event) => {
                            const next = clamp(Number(event.detail.value), 1, totalWeeks);
                            patchRow(
                              row.key,
                              next > row.draft.endWeek
                                ? { startWeek: next, endWeek: next }
                                : { startWeek: next },
                            );
                          }}
                        />
                        <Input
                          className="field__input"
                          type="number"
                          value={String(row.draft.endWeek)}
                          onInput={(event) => {
                            const next = clamp(Number(event.detail.value), 1, totalWeeks);
                            patchRow(
                              row.key,
                              next < row.draft.startWeek
                                ? { endWeek: next, startWeek: next }
                                : { endWeek: next },
                            );
                          }}
                        />

                        <Picker
                          mode="selector"
                          range={parityLabels}
                          value={parityIndex}
                          onChange={(event) => {
                            const option = WEEK_PARITY_OPTIONS[Number(event.detail.value)];
                            if (option) patchRow(row.key, { weekParity: option.value });
                          }}
                        >
                          <View className="field__select"><Text>{parityLabels[parityIndex]}</Text></View>
                        </Picker>
                      </View>

                      {(row.issues.length > 0 || row.duplicate) && (
                        <View className="preview-row__issues">
                          {row.duplicate && <Text className="badge badge--dup">与现有课程重复</Text>}
                          {row.issues.map((issue) => (
                            <Text key={issue} className="badge badge--warn">{issue}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}

                {rows.length === 0 && (
                  <View className="preview-row preview-row--empty">
                    <Text>没有识别出任何课程，换个粘贴格式试试，或回上一页检查文字。</Text>
                  </View>
                )}
              </View>

              {/* 迁移说明：<details>/<summary>/<pre> 小程序都不支持，改成 state 控制的展开区 */}
              {unmatched.length > 0 && (
                <View className="import-unmatched">
                  <View className="import-unmatched__summary" onClick={() => setShowUnmatched((prev) => !prev)}><Text>未识别的 {unmatched.length} 行（点开查看）</Text></View>
                  {showUnmatched && (
                    <View className="import-unmatched__body">
                      {unmatched.map((line, index) => (
                        <Text key={index} className="import-unmatched__line">{line}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        <View className="modal__foot">
          {step === 'preview' ? (
            <View className="modal__foot-inner">
              <View className="btn btn--secondary" onClick={() => setStep('input')}><Text>返回修改</Text></View>
              <View
                className={`btn btn--primary${selectedRows.length === 0 ? ' btn--disabled' : ''}`}
                onClick={handleImport}
              ><Text>导入 {selectedRows.length} 门</Text></View>
            </View>
          ) : (
            <View className="modal__foot-inner">
              <View className="btn btn--secondary" onClick={onClose}><Text>取消</Text></View>
              <View
                className={`btn btn--primary${text.trim() ? '' : ' btn--disabled'}`}
                onClick={handleParse}
              ><Text>开始解析</Text></View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
