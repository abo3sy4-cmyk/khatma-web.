import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, onSnapshot, collection, query, where, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const adminLink = document.getElementById('adminLink');

const newsTickerContainer = document.getElementById('newsTickerContainer');
const newsText = document.getElementById('newsText');

let currentUserData = null; 

// جلب الإعدادات (شريط الأخبار)
function listenToSettings() {
    onSnapshot(doc(db, "settings", "general"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            newsText.innerText = data.newsTickerText;
            if (data.isTickerActive) {
                newsTickerContainer.classList.remove('d-none');
            } else {
                newsTickerContainer.classList.add('d-none');
            }
        }
    });
}

listenToSettings();

// تسجيل الدخول
loginBtn.addEventListener('click', () => {
    const email = document.getElementById('emailInput').value;
    const password = document.getElementById('passwordInput').value;
    
    if(!email || !password) {
        Swal.fire({ icon: 'warning', title: 'تنبيه', text: 'الرجاء إدخال البريد وكلمة المرور', confirmButtonColor: '#198754' });
        return;
    }

    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جاري الدخول...';
    loginBtn.disabled = true;
    
    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            Swal.fire({ icon: 'success', title: 'تم الدخول بنجاح', showConfirmButton: false, timer: 1500 });
        })
        .catch((error) => {
            Swal.fire({ icon: 'error', title: 'خطأ', text: 'تأكد من صحة البيانات', confirmButtonColor: '#d33' });
        })
        .finally(() => {
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
        });
});

// تسجيل الخروج
logoutBtn.addEventListener('click', () => {
    Swal.fire({
        title: 'هل أنت متأكد؟',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'نعم، خروج',
        cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) {
            signOut(auth);
        }
    });
});

// مراقبة حالة المستخدم
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
            currentUserData = { uid: user.uid, ...userDocSnap.data() };
            authSection.classList.add('d-none');
            dashboardSection.classList.remove('d-none');
            logoutBtn.classList.remove('d-none');
            
            if (currentUserData.role === 'admin') {
                adminLink.classList.remove('d-none');
            } else {
                adminLink.classList.add('d-none');
            }
            listenToKhatmas();
        }
    } else {
        authSection.classList.remove('d-none');
        dashboardSection.classList.add('d-none');
        logoutBtn.classList.add('d-none');
        adminLink.classList.add('d-none');
        currentUserData = null;
    }
});

// مراقبة الختمات وعرضها
function listenToKhatmas() {
    const khatmasContainer = document.getElementById('khatmasContainer');
    const q = query(collection(db, "khatmas"), where("status", "==", "open"));
    
    onSnapshot(q, (snapshot) => {
        khatmasContainer.innerHTML = '';
        if (snapshot.empty) {
            khatmasContainer.innerHTML = '<div class="alert alert-info w-100 text-center">لا توجد ختمات مفتوحة حالياً.</div>';
            return;
        }

        snapshot.forEach((khatmaDoc) => {
            const khatma = khatmaDoc.data();
            const khatmaId = khatmaDoc.id;
            
            const card = document.createElement('div');
            card.className = "col-12 mb-4";
            
            let partsHTML = '<div class="d-flex flex-wrap gap-2 justify-content-center mt-3">';
            khatma.parts.forEach(part => {
                let btnClass = "btn-outline-success"; 
                let btnText = `الجزء ${part.partNumber}`;
                let onClick = `onclick="window.requestPart('${khatmaId}', '${khatma.title}', ${part.partNumber})"`;
                let disabled = "";

                if (part.status === "pending") {
                    btnClass = "btn-warning text-dark"; 
                    btnText = `الجزء ${part.partNumber}<br><small>مراجعة</small>`;
                    disabled = "disabled";
                    onClick = "";
                } else if (part.status === "booked") {
                    btnClass = "btn-secondary"; 
                    btnText = `الجزء ${part.partNumber}<br><small>${part.userName}</small>`;
                    disabled = "disabled";
                    onClick = "";
                }

                partsHTML += `<button class="btn ${btnClass} p-2" style="width: 85px; font-size: 14px;" ${onClick} ${disabled}>${btnText}</button>`;
            });
            partsHTML += '</div>';

            card.innerHTML = `
                <div class="card shadow-sm border-0">
                    <div class="card-body">
                        <h4 class="card-title text-primary text-center">🕋 ${khatma.title}</h4>
                        ${partsHTML}
                    </div>
                </div>
            `;
            khatmasContainer.appendChild(card);
        });
    });
}

// طلب حجز الجزء
window.requestPart = async (khatmaId, khatmaTitle, partNumber) => {
    Swal.fire({
        title: `حجز الجزء ${partNumber}؟`,
        text: `هل أنت متأكد من قدرتك على قراءة الجزء ${partNumber} من ${khatmaTitle}؟`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'نعم، أطلب الحجز',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: '#198754'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await addDoc(collection(db, "requests"), {
                    khatmaId: khatmaId,
                    khatmaTitle: khatmaTitle,
                    partNumber: partNumber,
                    userId: currentUserData.uid,
                    userName: currentUserData.name,
                    status: "pending",
                    timestamp: new Date()
                });

                const khatmaRef = doc(db, "khatmas", khatmaId);
                const khatmaSnap = await getDoc(khatmaRef);
                let parts = khatmaSnap.data().parts;
                parts[partNumber - 1].status = "pending";
                await updateDoc(khatmaRef, { parts: parts });

                Swal.fire('تم الإرسال', 'تم إرسال طلبك للأدمن، في انتظار الموافقة.', 'success');
            } catch (error) {
                Swal.fire('خطأ', 'حدث خطأ: ' + error.message, 'error');
            }
        }
    });
};
