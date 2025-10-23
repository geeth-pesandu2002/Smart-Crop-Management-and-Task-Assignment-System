// src/i18n/strings.js
const STRINGS = {
  en: {
    status: {
      title: "Crop Health Status",
      sub: "View health status of crops for each plot",
      overallHealth: "Overall Health",
      healthy: "Healthy",
      byPlot: "Crop Health by Plot",
      byPlotSub: "Calculated as (Qty discarded / Qty harvested) × 100%",
      fieldName: "Field Name",
      cropType: "Crop Type",
      health: "Health (%)",
      details: "Details",
      viewEdit: "View/Edit",
      noPlots: "No plots found"
    },
      brand: "Smart Crop Management and Task Assignment System",
      settings: {
  delete: "Delete",
  confirmDelete: "Are you sure you want to delete this user?",
  deleteSuccess: "User deleted.",
  deleteFail: "Failed to delete user.",
  delete: "ඉවත් කරන්න",
  confirmDelete: "මෙම පරිශීලකයා ඉවත් කිරීමට ඔබට විශ්වාසද?",
  deleteSuccess: "පරිශීලකයා ඉවත් කරන ලදී.",
  deleteFail: "පරිශීලකයා ඉවත් කිරීමට නොහැකි විය.",
        title: "Settings & Staff",
        profile: "Profile Information",
        fullName: "Full Name",
        email: "Email",
        phone: "Phone",
        role: "Role",
        save: "Save changes",
        password: "Password",
        currentPassword: "Current Password",
        newPassword: "New Password (min 8)",
        confirmPassword: "Confirm New Password",
        clear: "Clear",
        updatePassword: "Update Password",
        staffManagement: "Staff Management",
        searchPh: "Search by name / phone / userId / email",
        search: "Search",
        addMember: "Add member",
        userId: "User ID",
        name: "Name",
        status: "Status",
        active: "Active",
        onLeave: "On leave",
        viewDetails: "View details",
        noStaff: "No staff to show.",
        pageInfo: "Page {page} of {pageCount} · {total} total",
        prev: "◀ Prev",
        next: "Next ▶",
        currentlyOnLeave: "Currently on Leave",
        extendOneDay: "Extend 1 day",
        endToday: "End today",
        everyoneActive: "Everyone is active.",
      },
    nav: { dashboard: "Dashboard", support: "Support", login: "Log in" },
    landing: {
      headline: "Smart Crop Management and Task Assignment System",
      sub: "Plan plots, assign staff tasks, and monitor farm data in one place.",
      getStarted: "Get Started",
      demo: "See Demo",
      cards: [
        { h: "Real-time monitoring", p: "See soil/plots at a glance (IoT-ready)." },
        { h: "Task assignment", p: "Assign, track, and verify staff work quickly." },
        { h: "Reports & insights", p: "Harvest, costs, and performance summaries." }
      ]
    },
    login: {
      welcomeTitle: "Welcome back, Manager",
      welcomeBullets: [
        "Assign tasks with priority & due dates",
        "Track staff status in real-time",
        "Review plots, harvest & resources"
      ],
      boxTitle: "Login to your account",
      boxSub: "Use the credentials provided to the farm manager.",
      inputs: [
        { name: "email", type: "email", label: "User ID (email)", placeholder: "you@example.com" },
        { name: "password", type: "password", label: "Password", placeholder: "••••••••" }
      ],
      email: "User ID (email)",
      password: "Password",
      forgot: "Forgot password?",
      backHome: "Back to Home",
      loginBtn: "Login",
      onlyManager: "Only the farm manager can access the web dashboard.",
      success: "Login successful. Redirecting…",
      failed: "Login failed"
    },

    tasks: {
      title: "Staff Task Assignment",
      subtitle: "Create and dispatch tasks to individuals or groups, attach plots and voice notes.",
      modeIndividual: "Individual",
      modeGroup: "Group",
      kpi: { pending: "Pending", in_progress: "In progress", blocked: "Blocked", completed: "Completed" },
      form: {
        create: "Create task",
        hint: "Fill details, pick a target (individual or group), optionally attach plot & voice note.",
        title: "Title",
        titlePh: "e.g., Weed removal",
        priority: "Priority",
        desc: "Description",
        descPh: "Add helpful instructions",
        assignStaff: "Assign to staff",
        assignGroup: "Assign to group",
        shared: "Create a single shared task for the whole group",
        plot: "Plot",
        due: "Due date",
        voice: "Voice note",
        attach: "Attach",
        attached: "Attached",
        submit: "Assign Task",
        clear: "Clear",
        selectStaff: "-- Select Staff --",
        selectGroup: "-- Select Group --",
        selectPlot: "-- Select Plot --",
        low: "Low", normal: "Normal", high: "High"
      },
      table: {
        recent: "Recent tasks",
        hint: "Latest 10 tasks with assignee/group, plot, and status.",
        head: { title: "Title", assigned: "Assigned", plot: "Plot", priority: "Priority", status: "Status", due: "Due" },
        groupPrefix: "Group: "
      },
      f: {
        statusAll: "All statuses",
        priorityAll: "All priorities",
        staffAll: "All staff",
        groupAll: "All groups",
        plotAll: "All plots",
        clear: "Clear",
        prev: "Prev",
        next: "Next"
      },
      comments: {
        col: "Comments",
        add: "Comments",
        show: "Show",
        hide: "Hide",
        count: "notes",
        loading: "Loading…",
        placeholder: "Add a short note for your staff…",
        save: "Save",
        cancel: "Cancel",
        empty: "No notes yet.",
        unknown: "Unknown"
      },
      msg: {
        needStaff: "Select a staff member",
        needGroup: "Select a group",
        created: "✅ Task created",
        uploadOk: "🎤 Voice note attached",
        uploadFail: "❌ Voice upload failed",
        createFail: "❌ Failed to create task",
        loadMetaFail: "❌ Failed to load staff/groups/plots",
        loadTasksFail: "❌ Failed to load tasks",
        loadNotesFail: "❌ Failed to load notes",
        noteAdded: "✅ Note added",
        noteAddFail: "❌ Failed to add note"
      }
    },

    // --- Plots / Land & Crop ---
    plots: {
      listTitle: "Farm Plots",
      listSub: "Manage fields, crops & harvest history",
      addPlot: "+ Add Plot",
      searchPh: "Search field or crop…",
      kpi: { area: "Total Area", harvested: "Total Harvested", discarded: "Total Discarded", earnings: "Total Earnings" },
      table: {
        title: "Plots",
        sub: "Click a row to open the plot editor and harvest cycles.",
        head: { field: "Field", crop: "Crop", area: "Area", planted: "Planted", harvested: "Harvested", discarded: "Discarded", earnings: "Earnings" },
        open: "Open",
        del: "Delete",
        none: "No plots found"
      },
      edit: {
        new: "New Plot",
        edit: "Edit Plot",
        hint: "Draw the field polygon and record crop & harvest info.",
        backList: "Back to list",
        detailsTitle: "Plot details",
        detailsSub: "These details determine reporting and harvest planning.",
        fieldName: "Field name",
        cropType: "Crop type",
        area: "Area",
        unit: { ac: "ac", ha: "ha", m2: "m²" },
        toAc: "to ac",
        toHa: "to ha",
        toM2: "to m²",
        plantingDate: "Planting date",
        removeShape: "Remove current shape",
        cancel: "Cancel",
        save: "Save changes",
        create: "Create plot",
        harvested: "Harvested",
        discarded: "Discarded",
        earnings: "Earnings"
      }
    },

    // --- NEW: Reports page strings ---
    reports: {
      title: "Resource Usage Reports",
      month: "Month",
      category: "Category",
      all: "All",
      fertilizer: "Fertilizers",
      seeds: "Seeds",
      pesticide: "Pesticides",
      period: "Period",
      ytd: "Monthly Resource Cost (YTD)",
      dist: "Resource Category Distribution",
      downloadCsv: "Download CSV",
      downloadPdf: "Download PDF",
      goDashboard: "Go to Dashboard",
      tableHead: {
        month: "Month",
        resource: "Resource",
        category: "Category",
        qty: "Total Qty",
        unit: "Unit"
      },
      loading: "Loading…",
      noData: "No data"
    },

    footer: "© 2025 Labuduwa Farmhouse",
    langToggle: "සිං / EN"
  },

  si: {
    status: {
      title: "බෝග සෞඛ්‍ය තත්ත්වය",
      sub: "සෑම බිම් කොටසකම බෝග සෞඛ්‍ය තත්ත්වය බලන්න",
      overallHealth: "මුළු සෞඛ්‍යය",
      healthy: "සෞඛ්‍යවත්",
      byPlot: "බිම් කොටස අනුව බෝග සෞඛ්‍යය",
      byPlotSub: "ගණනය කිරීම: (ප්‍රතික්ෂේප ප්‍රමාණය / අස්වැන්න ප්‍රමාණය) × 100%",
      fieldName: "ක්ෂේත්‍ර නාමය",
      cropType: "බෝග වර්ගය",
      health: "සෞඛ්‍යය (%)",
      details: "විස්තර",
      viewEdit: "බලන්න/සංස්කරණය කරන්න",
      noPlots: "බිම් කොටස් නොමැත"
    },
    brand: "දක්ෂ බෝග කළමනාකරණය සහ කාර්ය බෙදාහැරීමේ පද්ධතිය",
    settings: {
      title: "සැකසුම් සහ සේවකයින්",
      profile: "පැතිකඩ තොරතුරු",
      fullName: "සම්පූර්ණ නම",
      email: "ඊමේල්",
      phone: "දුරකථන අංකය",
      role: "භූමිකාව",
      save: "වෙනස්කම් සුරකින්න",
      password: "මුරපදය",
      currentPassword: "වත්මන් මුරපදය",
      newPassword: "නව මුරපදය (අවම 8)",
      confirmPassword: "නව මුරපදය තහවුරු කරන්න",
      clear: "මකන්න",
      updatePassword: "මුරපදය යාවත්කාලීන කරන්න",
      staffManagement: "සේවක කළමනාකරණය",
      searchPh: "නම / දුරකථන / පරිශීලක ID / ඊමේල් අනුව සොයන්න",
      search: "සොයන්න",
      addMember: "අලුත් සාමාජිකයෙක් එක් කරන්න",
      userId: "පරිශීලක ID",
      name: "නම",
      status: "තත්ත්වය",
      active: "සක්‍රීයයි",
      onLeave: " නිවාඩු මත",
      viewDetails: "විස්තර බලන්න",
      noStaff: "පෙන්වීමට සේවකයින් නොමැත.",
      pageInfo: "පිටුව {page} / {pageCount} · මුළු {total}",
      prev: "◀ පෙර",
      next: "ඊළඟ ▶",
      currentlyOnLeave: "දැනට නිවාඩු මත",
      extendOneDay: "දින 1ක් දිගු කරන්න",
      endToday: "අද නිම කරන්න",
      everyoneActive: "සියල්ලන්ම සක්‍රීයයි.",
    },
    nav: { dashboard: "පුවරුව", support: "සහාය", login: "පිවිසෙන්න" },
    landing: {
      headline: "දක්ෂ බෝග කළමනාකරණය සහ කාර්ය බෙදාහැරීමේ පද්ධතිය",
      sub: "එක්ම තිරයකින් බිම් සැලසුම්, කාර්ය බෙදාහැරීම සහ නිරීක්ෂණය.",
      getStarted: "ඇරඹීමට",
      demo: "ඩෙමෝ බලන්න",
      cards: [
        { h: "ක්ෂණික නිරීක්ෂණය", p: "බිම්/මාටි තත්ත්වය එක් දර්ශනයකින් (IoT සූදානම්)." },
        { h: "කාර්ය බෙදාහැරීම", p: "කාර්ය ලබාදීම, අනුගමනය හා තහවුරු කිරීම ඉක්මනින්." },
        { h: "වාර්තා සහ දත්ත", p: "අස්වනු, ගාස්තු, කාර්ය සාධනය පිළිබඳ සාරාංශ." }
      ]
    },
    login: {
      welcomeTitle: "කළමනාකරු සඳහා පිවිසුම",
      welcomeBullets: [
        "ප්‍රමුඛතා හා අවසන් දිනයන් සමඟ කාර්ය ලබාදෙන්න",
        "සේවක තත්ත්වය වහාම බලන්න",
        "බිම් කොටස්, අස්වැන්න, සම්පත් පරීක්ෂා කරන්න"
      ],
      boxTitle: "ඔබගේ ගිණුමට පිවිසෙන්න",
      boxSub: "කෘෂි කළමනාකරුවාට ලබාදුන් විස්තර භාවිතා කරන්න.",
      inputs: [
        { name: "email", type: "email", label: "පරිශීලක Email", placeholder: "you@example.com" },
        { name: "password", type: "password", label: "මුරපදය", placeholder: "••••••••" }
      ],
      email: "පරිශීලක Email",
      password: "මුරපදය",
      forgot: "මුරපදය අමතකද?",
      backHome: "මුල් පිටුවට",
      loginBtn: "පිවිසෙන්න",
      onlyManager: "වෙබ් පුවරුවට පිවිසිය හැක්කේ කළමනාකරුවෙකුට පමණි.",
      success: "සාර්ථකයි. යළි-දිගුවට ගෙනයයි…",
      failed: "පිවිසුම අසාර්ථකයි"
    },

    tasks: {
      title: "සේවක කාර්ය පවරන්න",
      subtitle: "තනි පුද්ගලයින්ට හෝ කණ්ඩායම්වලට කාර්ය පවරා, බිම් කොටස් හා හඬ සටහන් එක් කරන්න.",
      modeIndividual: "තනි පුද්ගලයෙක්",
      modeGroup: "කණ්ඩායම",
      kpi: { pending: "පොරොත්තුයි", in_progress: "සංවර්ධනයේ", blocked: "අඩුගත", completed: "සම්පූර්ණයි" },
      form: {
        create: "කාර්යයක් සාදන්න",
        hint: "විස්තර පුරවා, තනි/කණ්ඩායම තෝරන්න. අවශ්‍ය නම් බිම් කොටස් හා හඬ සටහන් එක් කරන්න.",
        title: "ශීර්ෂය",
        titlePh: "උදා: කඩැල් ඉවත් කිරීම",
        priority: "ප්‍රමුඛතාව",
        desc: "විස්තර",
        descPh: "උපකාරී උපදෙස් ඇතුළත් කරන්න",
        assignStaff: "සේවකයෙකුට පවරන්න",
        assignGroup: "කණ්ඩායමකට පවරන්න",
        shared: "සියලු කණ්ඩායමට එක් කාර්යයක් ලෙස සෑදෙන්න",
        plot: "බිම් කොටස",
        due: "නියමිත දිනය",
        voice: "හඬ සටහන",
        attach: "එක් කරන්න",
        attached: "එක් කර ඇත",
        submit: "කාර්ය පවරන්න",
        clear: "මකන්න",
        selectStaff: "-- සේවකයෙකු තෝරන්න --",
        selectGroup: "-- කණ්ඩායමක් තෝරන්න --",
        selectPlot: "-- බිම් කොටසක් තෝරන්න --",
        low: "අඩු", normal: "සාමාන්‍ය", high: "ඉහළ"
      },
      table: {
        recent: "මෑත කාර්ය",
        hint: "සේවකයෙකු/කණ්ඩායම, බිම් කොටස හා තත්ත්වය සමඟ මෑත කාර්ය 10.",
        head: {
          title: "ශීර්ෂය",
          assigned: "පවරා ඇත්තේ",
          plot: "බිම් කොටස",
          priority: "ප්‍රමුඛතාව",
          status: "තත්ත්වය",
          due: "නියමිත දිනය"
        },
        groupPrefix: "කණ්ඩායම: "
      },
      f: {
        statusAll: "සියලු තත්ත්ව",
        priorityAll: "සියලු ප්‍රමුඛතා",
        staffAll: "සියලු සේවකයින්",
        groupAll: "සියලු කණ්ඩායම්",
        plotAll: "සියලු බිම්",
        clear: "මකන්න",
        prev: "පෙර",
        next: "ඊළඟ"
      },
      comments: {
        col: "සටහන්",
        add: "සටහන්",
        show: "පෙන්වන්න",
        hide: "සඟවන්න",
        count: "සටහන්",
        loading: "පූරණය වේ…",
        placeholder: "සේවකයාට කෙටි සටහනක් සඳහන් කරන්න…",
        save: "සුරකින්න",
        cancel: "අවලංගු",
        empty: "සටහන් නැත.",
        unknown: "නොදන්නා"
      },
      msg: {
        needStaff: "සේවකයෙකු තෝරන්න",
        needGroup: "කණ්ඩායමක් තෝරන්න",
        created: "✅ කාර්යය සෑදිනි",
        uploadOk: "🎤 හඬ සටහන එකතු කළා",
        uploadFail: "❌ හඬ සටහන එකතුවූයේ නැත",
        createFail: "❌ කාර්යය සෑදීමේදී දෝෂයකි",
        loadMetaFail: "❌ සේවක/කණ්ඩායම්/බිම් දත්ත ලබා ගැනීම අසාර්ථකයි",
        loadTasksFail: "❌ කාර්ය වාර්තා ලබා ගැනීම අසාර්ථකයි",
        loadNotesFail: "❌ සටහන් පූරණය අසාර්ථකයි",
        noteAdded: "✅ සටහන එකතු කළා",
        noteAddFail: "❌ සටහන එකතු කිරීමට නොහැකි විය"
      }
    },

    // --- Plots / Land & Crop (Sinhala) ---
    plots: {
      listTitle: "ගොවි බිම් කොටස්",
      listSub: "ක්ෂේත්‍ර, බෝග සහ අස්වැන්න ඉතිහාසය කළමනාකරණය කරන්න",
      addPlot: "+ නව බිම් කොටසක්",
      searchPh: "ක්ෂේත්‍රය හෝ බෝගය සොයන්න…",
      kpi: { area: "මේදම මුළු එකතුව", harvested: "මුළු අස්වැන්න", discarded: "ප්‍රතික්ෂේපය", earnings: "මුළු ආදායම" },
      table: {
        title: "බිම් කොටස්",
        sub: "බිම් සංස්කරණය සහ අස්වැන්න සටහන් සඳහා පෙළක් ක්ලික් කරන්න.",
        head: {
          field: "ක්ෂේත්‍රය",
          crop: "බෝගය",
          area: "මේදම",
          planted: "ඇළවුන දිනය",
          harvested: "අස්වැන්න",
          discarded: "ප්‍රතික්ෂේපය",
          earnings: "ආදායම"
        },
        open: "තොරන්න",
        del: "මකන්න",
        none: "බිම් කොටස් නැත"
      },
      edit: {
        new: "නව බිම් කොටස",
        edit: "බිම් කොටස යාවත්කාලීන",
        hint: "නක්ෂය මත කොටස ලියන් කර බෝග/අස්වනු විස්තර සටහන් කරන්න.",
        backList: "ලැයිස්තුවට ආපසු",
        detailsTitle: "බිම් විස්තර",
        detailsSub: "වාර්තා සහ අස්වැන්න සැලසුම් සදහා මෙය භාවිතා වේ.",
        fieldName: "ක්ෂේත්‍ර නාමය",
        cropType: "බෝග වර්ගය",
        area: "මේදම",
        unit: { ac: "ඇකර", ha: "හෙක්ටයාර්", m2: "ච.මී." },
        toAc: "ඇකරට",
        toHa: "හෙක්ටයට",
        toM2: "ච.මී.ට",
        plantingDate: "ඇළවුන දිනය",
        removeShape: "වත්මන් රූපය ඉවත් කරන්න",
        cancel: "අවලංගු",
        save: "යාවත්කාලීන කරන්න",
        create: "සටහන් කිරීම",
        harvested: "අස්වැන්න",
        discarded: "ප්‍රතික්ෂේපය",
        earnings: "ආදායම"
      }
    },

    // --- NEW: Reports page strings (Sinhala) ---
    reports: {
      title: "සම්පත් භාවිත වාර්තා",
      month: "මාසය",
      category: "ප්‍රවර්ගය",
      all: "සියල්ල",
      fertilizer: "වරගෙය",
      seeds: "බීජ",
      pesticide: "කෘමිනාශක",
      period: "කාල සීමාව",
      ytd: "මාසික වියදම් (මෙවැනි වර්ෂය)",
      dist: "ප්‍රවර්ග වාරි බෙදාහැරීම",
      downloadCsv: "CSV බාගත කරන්න",
      downloadPdf: "PDF බාගත කරන්න",
      goDashboard: "ඩෑෂ්බෝඩ් වෙත යන්න",
      tableHead: {
        month: "මාසය",
        resource: "සම්පත",
        category: "ප්‍රවර්ගය",
        qty: "මුළු ප්‍රමාණය",
        unit: "ඒකකය"
      },
      loading: "පූරණය වෙමින්…",
      noData: "දත්ත නොමැත"
    },

    footer: "© 2025 Labuduwa Farmhouse",
    langToggle: "EN / සිං"
  }
};

export default STRINGS;