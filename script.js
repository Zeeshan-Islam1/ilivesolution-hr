/* =========================================================
   iLiveSolution HR Reminder System
   Part 03 - script.js
   ========================================================= */

"use strict";


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "ilivesolution_hr_reminders_v2";
const THEME_KEY = "ilivesolution_theme";


/* =========================================================
   APP STATE
   ========================================================= */

let reminders = [];
let editingId = null;

let specialFilter = "all";

let alarmInterval = null;
let lastAlarmId = null;

let toastTimer = null;


/* =========================================================
   DOM
   ========================================================= */

const $ = (selector) =>
    document.querySelector(selector);

const $$ = (selector) =>
    [...document.querySelectorAll(selector)];


const el = {

    pageTitle: $("#pageTitle"),
    dashboardDate: $("#dashboardDate"),

    notificationBtn: $("#notificationBtn"),
    notificationIndicator: $("#notificationIndicator"),

    themeSelect: $("#themeSelect"),

    addReminderBtn: $("#addReminderBtn"),
    addReminderBtn2: $("#addReminderBtn2"),

    dashboardSection: $("#dashboardSection"),
    remindersSection: $("#remindersSection"),

    totalReminders: $("#totalReminders"),
    pendingReminders: $("#pendingReminders"),
    todayReminders: $("#todayReminders"),
    overdueReminders: $("#overdueReminders"),

    upcomingList: $("#upcomingList"),
    viewAllBtn: $("#viewAllBtn"),

    dueNowCard: $("#dueNowCard"),
    dueNowTitle: $("#dueNowTitle"),
    dueNowDescription: $("#dueNowDescription"),
    stopAlarmBtn: $("#stopAlarmBtn"),

    searchInput: $("#searchInput"),
    statusFilter: $("#statusFilter"),
    departmentFilter: $("#departmentFilter"),
    exportCsvBtn: $("#exportCsvBtn"),

    remindersTableBody:
        $("#remindersTableBody"),

    reminderModal:
        $("#reminderModal"),

    modalTitle:
        $("#modalTitle"),

    closeModalBtn:
        $("#closeModalBtn"),

    cancelModalBtn:
        $("#cancelModalBtn"),

    reminderForm:
        $("#reminderForm"),

    reminderId:
        $("#reminderId"),

    employeeFields:
        $("#employeeFields"),

    employeeName:
        $("#employeeName"),

    employeeId:
        $("#employeeId"),

    department:
        $("#department"),

    reminderText:
        $("#reminderText"),

    reminderDate:
        $("#reminderDate"),

    reminderTime:
        $("#reminderTime"),

    reminderNotes:
        $("#reminderNotes"),

    toast:
        $("#toast"),

    toastTitle:
        $("#toastTitle"),

    toastMessage:
        $("#toastMessage")
};


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);


function init() {

    loadReminders();

    initDate();

    initTheme();

    initNavigation();

    initModal();

    initButtons();

    initFilters();

    initNotifications();

    updateDashboard();

    populateDepartments();

    renderTable();

    openDefaultMenu();

    checkDueReminders();

    setInterval(
        () => {

            checkDueReminders();

            updateDashboard();

        },
        10000
    );
}


/* =========================================================
   DATE
   ========================================================= */

function initDate() {

    if (!el.dashboardDate) {
        return;
    }

    const now = new Date();

    el.dashboardDate.textContent =
        now.toLocaleDateString(
            undefined,
            {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
}


function todayString() {

    const date = new Date();

    const y =
        date.getFullYear();

    const m =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const d =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${y}-${m}-${d}`;
}


function defaultTime() {

    const date = new Date();

    date.setMinutes(
        date.getMinutes() + 5
    );

    return [
        String(date.getHours())
            .padStart(2, "0"),

        String(date.getMinutes())
            .padStart(2, "0")
    ].join(":");
}


/* =========================================================
   STORAGE
   ========================================================= */

function loadReminders() {

    try {

        const raw =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!raw) {
            reminders = [];
            return;
        }

        const data =
            JSON.parse(raw);

        if (!Array.isArray(data)) {
            reminders = [];
            return;
        }


        /*
           Backward compatibility.
           Existing data stays intact.
        */

        reminders =
            data.map(
                normalizeReminder
            );

    } catch (error) {

        console.error(
            "Storage load error:",
            error
        );

        reminders = [];

        showToast(
            "Storage Error",
            "Could not read saved reminders."
        );
    }
}


function normalizeReminder(item) {

    const employeeName =
        item.employeeName ||
        item.name ||
        "";

    const employeeId =
        item.employeeId ||
        item.empId ||
        "";

    const department =
        item.department ||
        item.dept ||
        "";

    const text =
        item.text ||
        item.reminder ||
        item.task ||
        item.title ||
        "";

    const date =
        item.date ||
        item.reminderDate ||
        "";

    const time =
        item.time ||
        item.reminderTime ||
        "09:00";


    return {

        id:
            item.id ??
            makeId(),

        type:
            item.type ||
            (
                employeeName ||
                employeeId
                    ? "employee"
                    : "task"
            ),

        employeeName,

        employeeId,

        department,

        text,

        date,

        time,

        notes:
            item.notes ||
            "",

        completed:
            Boolean(
                item.completed ||
                item.status === "completed"
            ),

        createdAt:
            item.createdAt ||
            new Date().toISOString(),

        updatedAt:
            item.updatedAt ||
            new Date().toISOString()
    };
}


function saveReminders() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(reminders)
        );

    } catch (error) {

        console.error(
            "Storage save error:",
            error
        );

        showToast(
            "Save Error",
            "Could not save reminder."
        );
    }
}


function makeId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .slice(2, 9)
    );
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function initNavigation() {

    const parents =
        $$(".nav-parent");


    parents.forEach(
        (parent) => {

            parent.addEventListener(
                "click",
                () => {

                    const menuId =
                        parent.dataset.menu;

                    const menu =
                        document.getElementById(
                            menuId
                        );

                    if (!menu) {
                        return;
                    }


                    const currentlyOpen =
                        menu.classList.contains(
                            "open"
                        );


                    /*
                       Close every submenu first.
                       This guarantees there is never
                       an invisible clickable gap.
                    */

                    parents.forEach(
                        (other) => {

                            other.classList.remove(
                                "open"
                            );

                            const otherMenu =
                                document.getElementById(
                                    other.dataset.menu
                                );

                            if (otherMenu) {

                                otherMenu.classList.remove(
                                    "open"
                                );
                            }
                        }
                    );


                    /*
                       Open current menu if it was closed.
                    */

                    if (!currentlyOpen) {

                        parent.classList.add(
                            "open"
                        );

                        menu.classList.add(
                            "open"
                        );
                    }


                    /*
                       Parent page.
                    */

                    if (
                        menuId ===
                        "dashboardMenu"
                    ) {

                        showPage(
                            "dashboardSection"
                        );

                        setTitle(
                            "HR Dashboard"
                        );

                        specialFilter =
                            "all";

                        activateSubmenu(
                            '[data-dashboard-filter="overview"]'
                        );
                    }


                    if (
                        menuId ===
                        "reminderMenu"
                    ) {

                        showPage(
                            "remindersSection"
                        );

                        setTitle(
                            "All Reminders"
                        );

                        specialFilter =
                            "all";

                        if (el.statusFilter) {
                            el.statusFilter.value =
                                "all";
                        }

                        activateSubmenu(
                            '[data-reminder-view="all"]'
                        );

                        renderTable();
                    }
                }
            );
        }
    );


    $$(".submenu-btn").forEach(
        (button) => {

            button.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();

                    const page =
                        button.dataset.page;

                    const dashboardFilter =
                        button.dataset.dashboardFilter;

                    const reminderView =
                        button.dataset.reminderView;


                    activateButton(
                        button
                    );


                    showPage(page);


                    /*
                       Overview
                    */

                    if (
                        dashboardFilter ===
                        "overview"
                    ) {

                        specialFilter =
                            "all";

                        setTitle(
                            "HR Dashboard"
                        );

                        updateDashboard();

                        return;
                    }


                    /*
                       Due Today
                    */

                    if (
                        dashboardFilter ===
                        "today"
                    ) {

                        specialFilter =
                            "today";

                        setTitle(
                            "Due Today"
                        );

                        if (el.statusFilter) {
                            el.statusFilter.value =
                                "all";
                        }

                        renderTable();

                        return;
                    }


                    /*
                       Overdue
                    */

                    if (
                        dashboardFilter ===
                        "overdue"
                    ) {

                        specialFilter =
                            "overdue";

                        setTitle(
                            "Overdue Reminders"
                        );

                        if (el.statusFilter) {
                            el.statusFilter.value =
                                "overdue";
                        }

                        renderTable();

                        return;
                    }


                    /*
                       Reminder menu.
                    */

                    if (reminderView) {

                        specialFilter =
                            "all";

                        if (el.statusFilter) {
                            el.statusFilter.value =
                                reminderView;
                        }


                        if (
                            reminderView ===
                            "all"
                        ) {
                            setTitle(
                                "All Reminders"
                            );
                        }


                        if (
                            reminderView ===
                            "pending"
                        ) {
                            setTitle(
                                "Pending Reminders"
                            );
                        }


                        if (
                            reminderView ===
                            "completed"
                        ) {
                            setTitle(
                                "Completed Reminders"
                            );
                        }


                        renderTable();
                    }

                }
            );
        }
    );
}


function openDefaultMenu() {

    const dashboardParent =
        document.querySelector(
            '.nav-parent[data-menu="dashboardMenu"]'
        );

    const dashboardMenu =
        document.getElementById(
            "dashboardMenu"
        );

    if (
        dashboardParent &&
        dashboardMenu
    ) {

        dashboardParent.classList.add(
            "open"
        );

        dashboardMenu.classList.add(
            "open"
        );
    }
}


function showPage(id) {

    $$(".page-section").forEach(
        (section) => {

            section.classList.toggle(
                "active",
                section.id === id
            );
        }
    );
}


function setTitle(title) {

    if (el.pageTitle) {
        el.pageTitle.textContent =
            title;
    }
}


function activateButton(button) {

    $$(".submenu-btn").forEach(
        (item) => {

            item.classList.remove(
                "active"
            );
        }
    );

    button.classList.add(
        "active"
    );
}


function activateSubmenu(selector) {

    $$(".submenu-btn").forEach(
        (item) => {

            item.classList.remove(
                "active"
            );
        }
    );

    const target =
        document.querySelector(selector);

    if (target) {
        target.classList.add(
            "active"
        );
    }
}


/* =========================================================
   MODAL
   ========================================================= */

function initModal() {

    if (el.closeModalBtn) {

        el.closeModalBtn.addEventListener(
            "click",
            closeModal
        );
    }


    if (el.cancelModalBtn) {

        el.cancelModalBtn.addEventListener(
            "click",
            closeModal
        );
    }


    if (el.reminderModal) {

        el.reminderModal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    el.reminderModal
                ) {
                    closeModal();
                }
            }
        );
    }


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Escape" &&
                el.reminderModal &&
                el.reminderModal.classList.contains(
                    "open"
                )
            ) {
                closeModal();
            }
        }
    );


    $$(
        'input[name="reminderType"]'
    ).forEach(
        (radio) => {

            radio.addEventListener(
                "change",
                updateTypeUI
            );
        }
    );


    if (el.reminderForm) {

        el.reminderForm.addEventListener(
            "submit",
            saveReminderFromForm
        );
    }
}


function openModal(type = "task", reminder = null) {

    editingId =
        reminder
            ? String(reminder.id)
            : null;


    if (el.reminderForm) {
        el.reminderForm.reset();
    }


    if (el.modalTitle) {

        el.modalTitle.textContent =
            reminder
                ? "Edit Reminder"
                : "Add Reminder";
    }


    const selected =
        document.querySelector(
            `input[name="reminderType"][value="${
                reminder
                    ? reminder.type
                    : type
            }"]`
        );


    if (selected) {
        selected.checked = true;
    }


    if (reminder) {

        el.employeeName.value =
            reminder.employeeName || "";

        el.employeeId.value =
            reminder.employeeId || "";

        el.department.value =
            reminder.department || "";

        el.reminderText.value =
            reminder.text || "";

        el.reminderDate.value =
            reminder.date ||
            todayString();

        el.reminderTime.value =
            reminder.time ||
            defaultTime();

        el.reminderNotes.value =
            reminder.notes || "";

    } else {

        el.reminderDate.value =
            todayString();

        el.reminderTime.value =
            defaultTime();
    }


    updateTypeUI();


    el.reminderModal.classList.add(
        "open"
    );

    el.reminderModal.setAttribute(
        "aria-hidden",
        "false"
    );


    setTimeout(
        () => {

            if (
                type === "employee" &&
                el.employeeName
            ) {

                el.employeeName.focus();

            } else if (
                el.reminderText
            ) {

                el.reminderText.focus();
            }

        },
        80
    );
}


function closeModal() {

    if (!el.reminderModal) {
        return;
    }

    el.reminderModal.classList.remove(
        "open"
    );

    el.reminderModal.setAttribute(
        "aria-hidden",
        "true"
    );

    editingId = null;
}


function updateTypeUI() {

    const radio =
        document.querySelector(
            'input[name="reminderType"]:checked'
        );

    const type =
        radio
            ? radio.value
            : "task";


    if (el.employeeFields) {

        el.employeeFields.style.display =
            type === "employee"
                ? ""
                : "none";
    }


    $$(".type-option").forEach(
        (option) => {

            const input =
                option.querySelector(
                    'input[name="reminderType"]'
                );

            option.classList.toggle(
                "active",
                Boolean(
                    input &&
                    input.checked
                )
            );
        }
    );
}


/* =========================================================
   FORM SAVE
   ========================================================= */

function saveReminderFromForm(event) {

    event.preventDefault();


    const typeInput =
        document.querySelector(
            'input[name="reminderType"]:checked'
        );


    const type =
        typeInput
            ? typeInput.value
            : "task";


    const text =
        el.reminderText.value.trim();

    const date =
        el.reminderDate.value;

    const time =
        el.reminderTime.value;


    if (!text) {

        showToast(
            "Reminder Required",
            "Please enter a reminder or task."
        );

        el.reminderText.focus();

        return;
    }


    if (!date || !time) {

        showToast(
            "Date & Time Required",
            "Please select date and time."
        );

        return;
    }


    const employeeName =
        el.employeeName.value.trim();

    if (
        type === "employee" &&
        !employeeName
    ) {

        showToast(
            "Employee Required",
            "Please enter employee name."
        );

        el.employeeName.focus();

        return;
    }


    const data = {

        type,

        employeeName:
            type === "employee"
                ? employeeName
                : "",

        employeeId:
            type === "employee"
                ? el.employeeId.value.trim()
                : "",

        department:
            el.department.value.trim(),

        text,

        date,

        time,

        notes:
            el.reminderNotes.value.trim()
    };


    /*
       EDIT
    */

    if (editingId !== null) {

        const index =
            reminders.findIndex(
                (item) =>
                    String(item.id) ===
                    String(editingId)
            );


        if (index !== -1) {

            reminders[index] = {

                ...reminders[index],

                ...data,

                updatedAt:
                    new Date().toISOString()
            };

            saveReminders();

            closeModal();

            updateDashboard();

            populateDepartments();

            renderTable();

            showToast(
                "Reminder Updated",
                "Reminder updated successfully."
            );

            return;
        }
    }


    /*
       NEW
    */

    reminders.push({

        id: makeId(),

        ...data,

        completed: false,

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()
    });


    saveReminders();

    closeModal();

    updateDashboard();

    populateDepartments();

    renderTable();

    showToast(
        "Reminder Added",
        "New reminder saved successfully."
    );
}


/* =========================================================
   BUTTONS
   ========================================================= */

function initButtons() {

    if (el.addReminderBtn) {

        el.addReminderBtn.addEventListener(
            "click",
            () => openModal("task")
        );
    }


    if (el.addReminderBtn2) {

        el.addReminderBtn2.addEventListener(
            "click",
            () => openModal("task")
        );
    }


    $$(".quick-action").forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const type =
                        button.dataset.quickAction;

                    openModal(
                        type === "employee"
                            ? "employee"
                            : "task"
                    );
                }
            );
        }
    );


    if (el.viewAllBtn) {

        el.viewAllBtn.addEventListener(
            "click",
            () => {

                showPage(
                    "remindersSection"
                );

                setTitle(
                    "All Reminders"
                );

                specialFilter =
                    "all";

                if (el.statusFilter) {
                    el.statusFilter.value =
                        "all";
                }

                activateSubmenu(
                    '[data-reminder-view="all"]'
                );

                renderTable();
            }
        );
    }


    if (el.stopAlarmBtn) {

        el.stopAlarmBtn.addEventListener(
            "click",
            stopAlarm
        );
    }


    if (el.remindersTableBody) {

        el.remindersTableBody.addEventListener(
            "click",
            (event) => {

                const button =
                    event.target.closest(
                        "[data-action]"
                    );

                if (!button) {
                    return;
                }


                handleAction(
                    button.dataset.action,
                    button.dataset.id
                );
            }
        );
    }
}


/* =========================================================
   TABLE ACTIONS
   ========================================================= */

function handleAction(action, id) {

    const reminder =
        reminders.find(
            (item) =>
                String(item.id) ===
                String(id)
        );


    if (!reminder) {
        return;
    }


    if (action === "edit") {

        openModal(
            reminder.type,
            reminder
        );

        return;
    }


    if (action === "complete") {

        reminder.completed = true;

        reminder.updatedAt =
            new Date().toISOString();

        saveReminders();

        stopAlarm();

        updateDashboard();

        renderTable();

        showToast(
            "Completed",
            "Reminder marked as completed."
        );

        return;
    }


    if (action === "reopen") {

        reminder.completed = false;

        reminder.updatedAt =
            new Date().toISOString();

        saveReminders();

        updateDashboard();

        renderTable();

        showToast(
            "Reopened",
            "Reminder is pending again."
        );

        return;
    }


    if (action === "delete") {

        if (
            !confirm(
                "Are you sure you want to delete this reminder?"
            )
        ) {
            return;
        }


        reminders =
            reminders.filter(
                (item) =>
                    String(item.id) !==
                    String(id)
            );


        saveReminders();

        updateDashboard();

        populateDepartments();

        renderTable();

        showToast(
            "Deleted",
            "Reminder deleted successfully."
        );
    }
}


/* =========================================================
   STATUS
   ========================================================= */

function getDateTime(reminder) {

    if (!reminder.date) {
        return null;
    }

    const date =
        new Date(
            `${reminder.date}T${
                reminder.time || "00:00"
            }:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}


function getStatus(reminder) {

    if (reminder.completed) {
        return "completed";
    }


    const due =
        getDateTime(reminder);


    if (
        due &&
        due.getTime() < Date.now()
    ) {
        return "overdue";
    }


    return "pending";
}


/* =========================================================
   FILTERS
   ========================================================= */

function initFilters() {

    if (el.searchInput) {

        el.searchInput.addEventListener(
            "input",
            renderTable
        );
    }


    if (el.statusFilter) {

        el.statusFilter.addEventListener(
            "change",
            () => {

                specialFilter =
                    "all";

                renderTable();
            }
        );
    }


    if (el.departmentFilter) {

        el.departmentFilter.addEventListener(
            "change",
            renderTable
        );
    }


    if (el.exportCsvBtn) {

        el.exportCsvBtn.addEventListener(
            "click",
            exportCsv
        );
    }
}


function filteredReminders() {

    let data =
        [...reminders];


    /*
       Special filter
    */

    if (
        specialFilter ===
        "today"
    ) {

        data =
            data.filter(
                (item) =>
                    item.date ===
                    todayString()
            );
    }


    if (
        specialFilter ===
        "overdue"
    ) {

        data =
            data.filter(
                (item) =>
                    getStatus(item) ===
                    "overdue"
            );
    }


    /*
       Status
    */

    const status =
        el.statusFilter
            ? el.statusFilter.value
            : "all";


    if (status !== "all") {

        data =
            data.filter(
                (item) =>
                    getStatus(item) ===
                    status
            );
    }


    /*
       Department
    */

    const department =
        el.departmentFilter
            ? el.departmentFilter.value
            : "all";


    if (
        department &&
        department !== "all"
    ) {

        data =
            data.filter(
                (item) =>
                    String(
                        item.department || ""
                    ).toLowerCase() ===
                    String(
                        department
                    ).toLowerCase()
            );
    }


    /*
       Search
    */

    const search =
        el.searchInput
            ? el.searchInput.value
                .trim()
                .toLowerCase()
            : "";


    if (search) {

        data =
            data.filter(
                (item) => {

                    const value = [

                        item.text,

                        item.employeeName,

                        item.employeeId,

                        item.department,

                        item.notes

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    return value.includes(
                        search
                    );
                }
            );
    }


    /*
       Sort by date/time.
    */

    data.sort(
        (a, b) => {

            const da =
                getDateTime(a);

            const db =
                getDateTime(b);


            if (!da && !db) {
                return 0;
            }

            if (!da) {
                return 1;
            }

            if (!db) {
                return -1;
            }

            return (
                da.getTime() -
                db.getTime()
            );
        }
    );


    return data;
}


/* =========================================================
   TABLE
   ========================================================= */

function renderTable() {

    if (!el.remindersTableBody) {
        return;
    }


    const data =
        filteredReminders();


    if (!data.length) {

        el.remindersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-content">
                        <div class="empty-state-title">
                            No reminders found
                        </div>
                        <div class="empty-state-text">
                            Add a reminder or change your filters.
                        </div>
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    el.remindersTableBody.innerHTML =
        data
            .map(
                createRow
            )
            .join("");
}


function createRow(reminder) {

    const status =
        getStatus(reminder);


    const statusText =
        status === "completed"
            ? "Completed"
            : status === "overdue"
                ? "Overdue"
                : "Pending";


    const typeText =
        reminder.type === "employee"
            ? "Employee"
            : "HR Task";


    const employee =
        reminder.type === "employee"
            ? `
                <div class="employee-cell">
                    <strong>
                        ${escapeHtml(
                            reminder.employeeName ||
                            "—"
                        )}
                    </strong>

                    ${
                        reminder.employeeId
                            ? `
                                <span>
                                    ${escapeHtml(
                                        reminder.employeeId
                                    )}
                                </span>
                            `
                            : ""
                    }
                </div>
            `
            : `<span class="muted-text">—</span>`;


    const completeButton =
        status === "completed"

            ? `
                <button
                    type="button"
                    class="table-action"
                    data-action="reopen"
                    data-id="${escapeHtml(
                        String(reminder.id)
                    )}"
                >
                    Reopen
                </button>
            `

            : `
                <button
                    type="button"
                    class="table-action"
                    data-action="complete"
                    data-id="${escapeHtml(
                        String(reminder.id)
                    )}"
                >
                    Complete
                </button>
            `;


    return `
        <tr>

            <td>

                <div class="reminder-cell">

                    <strong>
                        ${escapeHtml(
                            reminder.text ||
                            "Untitled Reminder"
                        )}
                    </strong>

                    ${
                        reminder.notes
                            ? `
                                <span>
                                    ${escapeHtml(
                                        reminder.notes
                                    )}
                                </span>
                            `
                            : ""
                    }

                </div>

            </td>


            <td>
                ${escapeHtml(typeText)}
            </td>


            <td>
                ${employee}
            </td>


            <td>
                ${
                    reminder.department
                        ? escapeHtml(
                            reminder.department
                        )
                        : "—"
                }
            </td>


            <td>
                ${formatDate(
                    reminder.date
                )}
            </td>


            <td>
                ${formatTime(
                    reminder.time
                )}
            </td>


            <td>

                <span
                    class="status-badge status-${status}"
                >
                    ${statusText}
                </span>

            </td>


            <td>

                <div class="table-actions">

                    ${completeButton}

                    <button
                        type="button"
                        class="table-action"
                        data-action="edit"
                        data-id="${escapeHtml(
                            String(reminder.id)
                        )}"
                    >
                        Edit
                    </button>

                    <button
                        type="button"
                        class="table-action danger"
                        data-action="delete"
                        data-id="${escapeHtml(
                            String(reminder.id)
                        )}"
                    >
                        Delete
                    </button>

                </div>

            </td>

        </tr>
    `;
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function updateDashboard() {

    const total =
        reminders.length;


    const pending =
        reminders.filter(
            (item) =>
                getStatus(item) ===
                "pending"
        ).length;


    const today =
        todayString();


    const todayCount =
        reminders.filter(
            (item) =>
                item.date === today &&
                !item.completed
        ).length;


    const overdue =
        reminders.filter(
            (item) =>
                getStatus(item) ===
                "overdue"
        ).length;


    if (el.totalReminders) {
        el.totalReminders.textContent =
            total;
    }


    if (el.pendingReminders) {
        el.pendingReminders.textContent =
            pending;
    }


    if (el.todayReminders) {
        el.todayReminders.textContent =
            todayCount;
    }


    if (el.overdueReminders) {
        el.overdueReminders.textContent =
            overdue;
    }


    renderUpcoming();
}


function renderUpcoming() {

    if (!el.upcomingList) {
        return;
    }


    const data =
        reminders
            .filter(
                (item) =>
                    !item.completed &&
                    getDateTime(item)
            )
            .sort(
                (a, b) =>
                    getDateTime(a) -
                    getDateTime(b)
            )
            .slice(0, 6);


    if (!data.length) {

        el.upcomingList.innerHTML = `
            <div class="empty-state-content">
                <div class="empty-state-title">
                    No upcoming reminders
                </div>

                <div class="empty-state-text">
                    Your scheduled reminders will appear here.
                </div>
            </div>
        `;

        return;
    }


    el.upcomingList.innerHTML =
        data.map(
            (item) => `
                <div class="upcoming-item">

                    <div class="upcoming-main">

                        <strong>
                            ${escapeHtml(
                                item.text ||
                                "Untitled Reminder"
                            )}
                        </strong>

                        <span>
                            ${
                                item.type ===
                                "employee"

                                    ? escapeHtml(
                                        item.employeeName ||
                                        "Employee Reminder"
                                    )

                                    : "HR Task"
                            }
                        </span>

                    </div>


                    <div class="upcoming-time">

                        <strong>
                            ${formatDate(
                                item.date
                            )}
                        </strong>

                        <span>
                            ${formatTime(
                                item.time
                            )}
                        </span>

                    </div>

                </div>
            `
        ).join("");
}


/* =========================================================
   DEPARTMENTS
   ========================================================= */

function populateDepartments() {

    if (!el.departmentFilter) {
        return;
    }


    const previous =
        el.departmentFilter.value;


    const departments =
        [...new Set(
            reminders
                .map(
                    (item) =>
                        String(
                            item.department ||
                            ""
                        ).trim()
                )
                .filter(Boolean)
        )]
        .sort(
            (a, b) =>
                a.localeCompare(b)
        );


    el.departmentFilter.innerHTML = `
        <option value="all">
            All Departments
        </option>

        ${departments
            .map(
                (department) => `
                    <option
                        value="${escapeHtml(
                            department
                        )}"
                    >
                        ${escapeHtml(
                            department
                        )}
                    </option>
                `
            )
            .join("")}
    `;


    if (
        departments.includes(
            previous
        )
    ) {

        el.departmentFilter.value =
            previous;
    }
}


/* =========================================================
   ALARM
   ========================================================= */

function checkDueReminders() {

    const now =
        Date.now();


    const reminder =
        reminders.find(
            (item) => {

                if (item.completed) {
                    return false;
                }


                const due =
                    getDateTime(item);


                if (!due) {
                    return false;
                }


                const difference =
                    now -
                    due.getTime();


                /*
                   Trigger only during the first
                   two minutes after due time.
                */

                return (
                    difference >= 0 &&
                    difference <= 120000
                );
            }
        );


    if (!reminder) {
        return;
    }


    if (
        lastAlarmId ===
        String(reminder.id)
    ) {
        return;
    }


    lastAlarmId =
        String(reminder.id);


    showDueNow(reminder);

    startAlarm();

    browserNotification(
        reminder
    );
}


function showDueNow(reminder) {

    if (!el.dueNowCard) {
        return;
    }


    el.dueNowTitle.textContent =
        reminder.text ||
        "Reminder Due";


    const employee =
        reminder.employeeName
            ? ` • ${reminder.employeeName}`
            : "";


    el.dueNowDescription.textContent =
        `${formatTime(
            reminder.time
        )}${employee}`;


    el.dueNowCard.classList.add(
        "active"
    );
}


function startAlarm() {

    if (alarmInterval) {
        return;
    }


    playSound();


    alarmInterval =
        setInterval(
            playSound,
            3000
        );
}


function stopAlarm() {

    if (alarmInterval) {

        clearInterval(
            alarmInterval
        );

        alarmInterval = null;
    }


    if (el.dueNowCard) {

        el.dueNowCard.classList.remove(
            "active"
        );
    }
}


function playSound() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) {
            return;
        }


        const context =
            new AudioContext();


        const oscillator =
            context.createOscillator();


        const gain =
            context.createGain();


        oscillator.type =
            "sine";


        oscillator.frequency.value =
            850;


        gain.gain.setValueAtTime(
            0.001,
            context.currentTime
        );


        gain.gain.exponentialRampToValueAtTime(
            0.12,
            context.currentTime + 0.03
        );


        gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + 0.45
        );


        oscillator.connect(
            gain
        );


        gain.connect(
            context.destination
        );


        oscillator.start();


        oscillator.stop(
            context.currentTime + 0.5
        );


        setTimeout(
            () => {
                context.close()
                    .catch(
                        () => {}
                    );
            },
            700
        );

    } catch (error) {

        console.warn(
            "Alarm unavailable:",
            error
        );
    }
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function initNotifications() {

    if (!el.notificationBtn) {
        return;
    }


    updateNotificationIndicator();


    el.notificationBtn.addEventListener(
        "click",
        async () => {

            if (
                !("Notification" in window)
            ) {

                showToast(
                    "Not Supported",
                    "This browser does not support notifications."
                );

                return;
            }


            try {

                const permission =
                    await Notification.requestPermission();


                updateNotificationIndicator();


                if (
                    permission ===
                    "granted"
                ) {

                    showToast(
                        "Notifications Enabled",
                        "Browser notifications are enabled."
                    );

                } else {

                    showToast(
                        "Notifications Disabled",
                        "Notification permission was not granted."
                    );
                }

            } catch (error) {

                console.error(
                    error
                );
            }
        }
    );
}


function updateNotificationIndicator() {

    if (!el.notificationIndicator) {
        return;
    }


    if (
        "Notification" in window &&
        Notification.permission ===
        "granted"
    ) {

        el.notificationIndicator.classList.add(
            "active"
        );

    } else {

        el.notificationIndicator.classList.remove(
            "active"
        );
    }
}


function browserNotification(
    reminder
) {

    if (
        !("Notification" in window)
    ) {
        return;
    }


    if (
        Notification.permission !==
        "granted"
    ) {
        return;
    }


    try {

        const notification =
            new Notification(
                "iLiveSolution HR Reminder",
                {
                    body:
                        reminder.text ||
                        "Reminder is due now.",
                    tag:
                        `hr-${reminder.id}`,
                    requireInteraction:
                        true
                }
            );


        notification.onclick =
            () => {

                window.focus();

                notification.close();
            };

    } catch (error) {

        console.warn(
            "Notification error:",
            error
        );
    }
}


/* =========================================================
   THEME
   ========================================================= */

function initTheme() {

    const saved =
        localStorage.getItem(
            THEME_KEY
        ) || "system";


    if (el.themeSelect) {

        el.themeSelect.value =
            saved;


        el.themeSelect.addEventListener(
            "change",
            () => {

                const theme =
                    el.themeSelect.value;


                localStorage.setItem(
                    THEME_KEY,
                    theme
                );


                applyTheme(
                    theme
                );
            }
        );
    }


    applyTheme(saved);
}


function applyTheme(theme) {

    if (
        theme ===
        "light"
    ) {

        document.documentElement
            .setAttribute(
                "data-theme",
                "light"
            );

        return;
    }


    if (
        theme ===
        "dark"
    ) {

        document.documentElement
            .setAttribute(
                "data-theme",
                "dark"
            );

        return;
    }


    const dark =
        window.matchMedia &&
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        ).matches;


    document.documentElement
        .setAttribute(
            "data-theme",
            dark
                ? "dark"
                : "light"
        );
}


/* =========================================================
   CSV
   ========================================================= */

function exportCsv() {

    const data =
        filteredReminders();


    if (!data.length) {

        showToast(
            "Nothing to Export",
            "No reminders match the current filters."
        );

        return;
    }


    const headers = [

        "Reminder",

        "Type",

        "Employee Name",

        "Employee ID",

        "Department",

        "Date",

        "Time",

        "Status",

        "Notes"

    ];


    const rows =
        data.map(
            (item) => [

                item.text || "",

                item.type === "employee"
                    ? "Employee Reminder"
                    : "HR Task",

                item.employeeName || "",

                item.employeeId || "",

                item.department || "",

                item.date || "",

                item.time || "",

                getStatus(item),

                item.notes || ""

            ]
        );


    const csv =
        [
            headers,
            ...rows
        ]
        .map(
            (row) =>
                row
                    .map(
                        csvEscape
                    )
                    .join(",")
        )
        .join("\r\n");


    const blob =
        new Blob(
            [
                "\uFEFF" +
                csv
            ],
            {
                type:
                    "text/csv;charset=utf-8"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `iLiveSolution_HR_Reminders_${todayString()}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    showToast(
        "CSV Exported",
        "Reminder data exported successfully."
    );
}


function csvEscape(value) {

    const text =
        String(
            value ?? ""
        );


    if (
        text.includes(",") ||
        text.includes('"') ||
        text.includes("\n") ||
        text.includes("\r")
    ) {

        return `"${text.replace(
            /"/g,
            '""'
        )}"`;
    }


    return text;
}


/* =========================================================
   FORMATTING
   ========================================================= */

function formatDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(
            `${value}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }


    return date.toLocaleDateString(
        undefined,
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatTime(value) {

    if (!value) {
        return "—";
    }


    const parts =
        value.split(":");


    if (parts.length < 2) {
        return value;
    }


    let hour =
        Number(parts[0]);


    const minute =
        parts[1];


    const suffix =
        hour >= 12
            ? "PM"
            : "AM";


    hour =
        hour % 12 || 12;


    return `${hour}:${minute} ${suffix}`;
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    title,
    message
) {

    if (!el.toast) {
        return;
    }


    el.toastTitle.textContent =
        title;


    el.toastMessage.textContent =
        message;


    el.toast.classList.add(
        "show"
    );


    if (toastTimer) {

        clearTimeout(
            toastTimer
        );
    }


    toastTimer =
        setTimeout(
            () => {

                el.toast.classList.remove(
                    "show"
                );

            },
            3200
        );
}


/* =========================================================
   SECURITY
   ========================================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


/* =========================================================
   SYSTEM THEME LISTENER
   ========================================================= */

if (window.matchMedia) {

    const media =
        window.matchMedia(
            "(prefers-color-scheme: dark)"
        );


    media.addEventListener(
        "change",
        () => {

            const theme =
                localStorage.getItem(
                    THEME_KEY
                ) || "system";


            if (
                theme ===
                "system"
            ) {

                applyTheme(
                    "system"
                );
            }
        }
    );
}


/* =========================================================
   END
   ========================================================= */