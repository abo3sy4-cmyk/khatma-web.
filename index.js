import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA6OZpGlpzLnaBRLDBubfRURlv1KvVywwU",
    authDomain: "khatma-22222.firebaseapp.com",
    projectId: "khatma-22222",
    storageBucket: "khatma-22222.firebasestorage.app",
    messagingSenderId: "1049174800429",
    appId: "1:1049174800429:web:f3c84e173a44377cdee0a4",
    measurementId: "G-8WE0X7VZBR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const newsInput = document.getElementById('newsInput');
const newsSwitch = document.getElementById('newsSwitch');
const saveNewsBtn = document.getElementById('saveNewsBtn');
const khatmaTitleInput = document.getElementById('khatmaTitleInput');
const addKhatmaBtn = document.getElementById('addKhatmaBtn');
const requestsContainer = document.getElementById('requestsContainer');

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== 'admin') {
        window.location.href = "index.html";
    } else {
        loadSettings();
        listenToRequests();
    }
});

async function loadSettings() {
    const docSnap = await getDoc(doc(db, "settings", "general"));
    if (docSnap.exists()) {
        newsInput.value = docSnap.data().newsTickerText;
        newsSwitch.checked = docSnap.data().isTickerActive;
    }
}

saveNewsBtn.addEventListener('click', async () => {
    saveNewsBtn.innerText = "جاري الحفظ...";
    try {
        await updateDoc(doc(db, "settings", "general"), {
            newsTickerText: newsInput.value,
            isTickerActive: newsSwitch.checked
        });
        Swal.fire('نجاح', 'تم تحديث شريط الأخبار', 'success');
    } catch (error) {
        Swal.fire('خطأ', error.message, 'error');
    }
    saveNewsBtn.innerText = "حفظ الإعدادات";
});

addKhatmaBtn.addEventListener('click', async () => {
    const title = khatmaTitleInput.value.trim();
    if (!title) {
        Swal.fire('تنبيه', 'يجب كتابة اسم الختمة', 'warning');
        return;
    }

    addKhatmaBtn.disabled = true;
    addKhatmaBtn.innerText = "جاري الإنشاء...";

    try {
        let partsArray = [];
        for (let i = 1; i <= 30; i++) {
            partsArray.push({
                partNumber: i,
                status: 'available',
                userId: null,
                userName: null
            });
        }

        await addDoc(collection(db, "khatmas"), {
            title: title,
            status: 'open',
            createdAt: new Date(),
            parts: partsArray
        });

        Swal.fire('نجاح', 'تم إضافة الختمة بنجاح', 'success');
        khatmaTitleInput.value = '';
    } catch (error) {
        Swal.fire('خطأ', 'حدث خطأ أثناء الإنشاء: ' + error.message, 'error');
    }
    
    addKhatmaBtn.disabled = false;
    addKhatmaBtn.innerText = "إنشاء (30 جزء)";
});

function listenToRequests() {
    const q = query(collection(db, "requests"), where("status", "==", "pending"));
    onSnapshot(q, (snapshot) => {
        requestsContainer.innerHTML = '';
        if (snapshot.empty) {
            requestsContainer.innerHTML = '<p class="text-muted small">لا توجد طلبات حالياً...</p>';
            return;
        }
        
        snapshot.forEach((requestDoc) => {
            const reqData = requestDoc.data();
            const reqId = requestDoc.id;
            
            const div = document.createElement('div');
            div.className = "border rounded p-2 mb-2 bg-white";
            div.innerHTML = `
                <strong>${reqData.userName}</strong> يطلب الجزء <strong>${reqData.partNumber}</strong><br>
                <small class="text-muted">الختمة: ${reqData.khatmaTitle}</small><br>
                <div class="mt-2 d-flex gap-2">
                    <button class="btn btn-sm btn-success w-50" onclick="window.approveReq('${reqId}', '${reqData.khatmaId}', ${reqData.partNumber}, '${reqData.userId}', '${reqData.userName}')">قبول</button>
                    <button class="btn btn-sm btn-danger w-50" onclick="window.rejectReq('${reqId}', '${reqData.khatmaId}', ${reqData.partNumber})">رفض</button>
                </div>
            `;
            requestsContainer.appendChild(div);
        });
    });
}

window.approveReq = async (reqId, khatmaId, partNumber, userId, userName) => {
    try {
        await updateDoc(doc(db, "requests", reqId), { status: "approved" });
        const khatmaRef = doc(db, "khatmas", khatmaId);
        const khatmaSnap = await getDoc(khatmaRef);
        let parts = khatmaSnap.data().parts;
        
        parts[partNumber - 1] = {
            partNumber: partNumber,
            status: "booked",
            userId: userId,
            userName: userName
        };
        await updateDoc(khatmaRef, { parts: parts });
        Swal.fire('تم', 'تمت الموافقة بنجاح', 'success');
    } catch (error) {
        Swal.fire('خطأ', error.message, 'error');
    }
};

window.rejectReq = async (reqId, khatmaId, partNumber) => {
    try {
        await updateDoc(doc(db, "requests", reqId), { status: "rejected" });
        const khatmaRef = doc(db, "khatmas", khatmaId);
        const khatmaSnap = await getDoc(khatmaRef);
        let parts = khatmaSnap.data().parts;
        
        parts[partNumber - 1].status = "available";
        await updateDoc(khatmaRef, { parts: parts });
        Swal.fire('تم', 'تم رفض الطلب', 'info');
    } catch (error) {
        Swal.fire('خطأ', error.message, 'error');
    }
};
