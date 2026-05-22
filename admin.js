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

onAuthStateChanged(auth, async (user) => {
    if (!user) { window.location.href = "index.html"; return; }
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
        document.getElementById('newsInput').value = docSnap.data().newsTickerText;
        document.getElementById('newsSwitch').checked = docSnap.data().isTickerActive;
    }
}

document.getElementById('saveNewsBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveNewsBtn');
    btn.innerText = "جاري الحفظ...";
    try {
        await updateDoc(doc(db, "settings", "general"), {
            newsTickerText: document.getElementById('newsInput').value,
            isTickerActive: document.getElementById('newsSwitch').checked
        });
        Swal.fire('نجاح', 'تم تحديث الأخبار', 'success');
    } catch (error) { Swal.fire('خطأ', error.message, 'error'); }
    btn.innerText = "حفظ الإعدادات";
});

document.getElementById('addKhatmaBtn').addEventListener('click', async () => {
    const title = document.getElementById('khatmaTitleInput').value.trim();
    if (!title) { Swal.fire('تنبيه', 'يجب كتابة اسم الختمة', 'warning'); return; }
    
    const btn = document.getElementById('addKhatmaBtn');
    btn.disabled = true; btn.innerText = "جاري الإنشاء...";

    try {
        let partsArray = [];
        for (let i = 1; i <= 30; i++) {
            partsArray.push({ partNumber: i, status: 'available', userId: null, userName: null, userPhoto: null });
        }
        await addDoc(collection(db, "khatmas"), { title: title, status: 'open', createdAt: new Date(), parts: partsArray });
        Swal.fire('نجاح', 'تم إضافة الختمة', 'success');
        document.getElementById('khatmaTitleInput').value = '';
    } catch (error) { Swal.fire('خطأ', error.message, 'error'); }
    
    btn.disabled = false; btn.innerText = "إنشاء (30 جزء)";
});

function listenToRequests() {
    const container = document.getElementById('requestsContainer');
    const q = query(collection(db, "requests"), where("status", "==", "pending"));
    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<p class="text-muted small text-center mt-3">لا توجد طلبات حالياً</p>';
            return;
        }
        snapshot.forEach((requestDoc) => {
            const reqData = requestDoc.data();
            const div = document.createElement('div');
            div.className = "border rounded p-3 mb-2 bg-white shadow-sm d-flex align-items-center justify-content-between";
            div.innerHTML = `
                <div>
                    <strong>${reqData.userName}</strong> <small>يطلب الجزء ${reqData.partNumber}</small><br>
                    <small class="text-muted">${reqData.khatmaTitle}</small>
                </div>
                <div class="d-flex flex-column gap-1">
                    <button class="btn btn-sm btn-success" onclick="window.approveReq('${requestDoc.id}', '${reqData.khatmaId}', ${reqData.partNumber}, '${reqData.userId}', '${reqData.userName}', '${reqData.userPhoto}')">قبول</button>
                    <button class="btn btn-sm btn-danger" onclick="window.rejectReq('${requestDoc.id}', '${reqData.khatmaId}', ${reqData.partNumber})">رفض</button>
                </div>
            `;
            container.appendChild(div);
        });
    });
}

window.approveReq = async (reqId, khatmaId, partNumber, userId, userName, userPhoto) => {
    try {
        await updateDoc(doc(db, "requests", reqId), { status: "approved" });
        const khatmaRef = doc(db, "khatmas", khatmaId);
        const khatmaSnap = await getDoc(khatmaRef);
        let parts = khatmaSnap.data().parts;
        parts[partNumber - 1] = { partNumber: partNumber, status: "booked", userId: userId, userName: userName, userPhoto: userPhoto };
        await updateDoc(khatmaRef, { parts: parts });
        Swal.fire('تم', 'تمت الموافقة', 'success');
    } catch (error) { Swal.fire('خطأ', error.message, 'error'); }
};

window.rejectReq = async (reqId, khatmaId, partNumber) => {
    try {
        await updateDoc(doc(db, "requests", reqId), { status: "rejected" });
        const khatmaRef = doc(db, "khatmas", khatmaId);
        const khatmaSnap = await getDoc(khatmaRef);
        let parts = khatmaSnap.data().parts;
        parts[partNumber - 1].status = "available";
        await updateDoc(khatmaRef, { parts: parts });
    } catch (error) { Swal.fire('خطأ', error.message, 'error'); }
};
