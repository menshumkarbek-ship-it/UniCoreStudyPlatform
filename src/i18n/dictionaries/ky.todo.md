# Kyrgyz (ky) translation review

The strings below are placeholders copied from `en.json` (or best-effort
guesses I am not fully confident in) because I am not a native Kyrgyz speaker.
**A native speaker must review and correct these before `ky` is used in
production.** Simple, well-established UI words (Меню, Сактоо, Чыгуу, etc.)
were translated directly and are not listed here, but should still get a
quick sanity check.

## English placeholders (untranslated, copied verbatim from en.json)

- `common.notifications.title`
- `common.notifications.markAllRead`
- `common.notifications.openNotifications`
- `common.footer.tagline`
- `common.footer.useCases`
- `common.footer.scanQr`
- `common.footer.useCaseItems.blendedLearning`
- `common.footer.useCaseItems.app`
- `common.footer.useCaseItems.moocs`
- `common.footer.useCaseItems.business`
- `common.misc.loading`
- `common.misc.connectedReady`
- `common.misc.refreshing`
- `auth.chooseRole`
- `auth.demoAccountLabel`
- `auth.universitySearchPlaceholder`
- `auth.noUniversitiesFound`
- `auth.identifierPlaceholder`
- `auth.passwordPlaceholder`
- `auth.demoModeNotice`
- `auth.errorMissingFields`
- `auth.errorMissingUniversity`
- `auth.errorGeneric`
- `auth.errorUnreachable`
- `dashboard.localDateTime`
- `dashboard.notificationsSubtitle`
- `dashboard.todoSubtitle`
- `dashboard.viewAllHomework`
- `dashboard.departmentOfMedicalSciences`
- `dashboard.teachingFaculty`
- `dashboard.teachingOverview`
- `dashboard.myCoursesSubtitle`
- `dashboard.professorWorkspace`
- `dashboard.homeworkGivenSubtitle`
- `dashboard.createNewAssignment`
- `dashboard.studentsSuffix`
- `dashboard.dueLabel`
- `dashboard.submittedOf`
- `dashboard.openAdministratorProfile`
- `dashboard.openStudentProfile`
- `dashboard.studentProfileSrOnly`
- `dashboard.openProfessorProfile`
- `admin.title`
- `admin.eyebrow`
- `admin.description`
- `admin.models`
- `admin.createFormNotice`
- `admin.recordDeleted`
- `admin.confirmDelete`
- `admin.record`
- `admin.details`
- `admin.actions`
- `admin.records_forms` (all 3 forms — Kyrgyz plural handling needs a native check; likely a single invariant form is correct, but confirm)
- `admin.resources.enrollments`
- `admin.resources.teachingAssignments`
- `subjects.academicCatalog`
- `subjects.teachingCatalog`
- `homework.publishHomework`
- `homework.needsAttention`
- `timetable.teachingSchedule`
- `timetable.classSchedule`
- `profile.title`
- `profile.subtitle`
- `profile.profilePhoto`
- `profile.personalInformation`
- `landing.tagline`
- `landing.courseAccess`
- `landing.courseAccessDescription`
- `landing.assignmentHub`
- `landing.assignmentHubDescription`
- `landing.progressInsights`
- `landing.progressInsightsDescription`

## Best-effort guesses (translated, but low confidence — please verify)

- `dashboard.homeworkGiven` ("Берилген үй тапшырмалар")
- `homework.submitted` ("Тапшырылды")
- `homework.task_forms` (Kyrgyz nouns typically do not change after a numeral;
  using the same invariant word "тапшырма" for all three forms — confirm this
  is the natural phrasing, e.g. "5 тапшырма" vs any alternative construction)
- `profile.security` ("Коопсуздук")
- `admin.resources.universities` / `.faculties` / `.professors` / `.subjects`
  / `.students` / `.groups` / `.timetable`

## Notes

- Do not treat any `ky` string as final until a native speaker signs off.
- When a key is fixed, remove it from this list.
