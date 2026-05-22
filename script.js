import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, where, addDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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
const storage = getStorage(app);

const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
let currentUserData = null;

// التبديل بين الدخول والتسجيل
document.getElementById('showLoginBtn').addEventListener('click', () => {
    document.getElementById('loginForm').classList.remove('d-none');
    document.getElementById('signupForm').classList.add('d-none');
    document.getElementById('showLoginBtn').classList.replace('btn-outline-primary', 'btn-primary');
    document.getElementById('showSignupBtn').classList.replace('btn-primary', 'btn-outline-primary');
});

document.getElementById('showSignupBtn').addEventListener('click', () => {
    document.getElementById('signupForm').classList.remove('d-none');
    document.getElementById('loginForm').classList.add('d-none');
    document.getElementById('showSignupBtn').classList.replace('btn-outline-primary', 'btn-primary');
    document.getElementById('showLoginBtn').classList.replace('btn-primary', 'btn-outline-primary');
});

// اختيار الصورة
let selectedImageFile = null;
document.getElementById('signupImage').addEventListener('change', function(e) {
    if(e.target.files[0]) {
        selectedImageFile = e.target.files[0];
        document.getElementById('previewImage').src = URL.createObjectURL(selectedImageFile);
    }
});

// إنشاء حساب
document.getElementById('signupBtn').addEventListener('click', async () => {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const pass = document.getElementById('signupPassword').value;
    
    if(!name || !email || !pass || !selectedImageFile) {
        Swal.fire('تنبيه', 'يجب تعبئة كل الحقول واختيار صورة شخصية', 'warning'); return;
    }

    const btn = document.getElementById('signupBtn');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جاري إنشاء الحساب...';
    btn.disabled = true;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;
        const storageRef = ref(storage, `users/${user.uid}`);
        await uploadBytes(storageRef, selectedImageFile);
        const photoURL = await getDownloadURL(storageRef);

        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            photoURL: photoURL,
            role: "user"
        });

        Swal.fire('نجاح', 'تم إنشاء الحساب بنجاح!', 'success');
    } catch (error) {
        Swal.fire('خطأ', error.message, 'error');
    } finally {
        btn.innerHTML = 'إنشاء الحساب';
        btn.disabled = false;
    }
});

// تسجيل الدخول
document.getElementById('loginBtn').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> جاري الدخول...';
    btn.disabled = true;

    signInWithEmailAndPassword(auth, email, password)
        .then(() => { Swal.fire({ icon: 'success', title: 'تم الدخول', showConfirmButton: false, timer: 1500 }); })
        .catch((error) => { Swal.fire('خطأ', 'البيانات غير صحيحة', 'error'); })
        .finally(() => { btn.innerHTML = 'تسجيل الدخول'; btn.disabled = false; });
});

// تسجيل الخروج
document.getElementById('logoutBtn').addEventListener('click', () => {
    Swal.fire({
        title: 'هل أنت متأكد؟', icon: 'question', showCancelButton: true, confirmButtonText: 'نعم، خروج', cancelButtonText: 'إلغاء'
    }).then((result) => {
        if (result.isConfirmed) signOut(auth);
    });
});

// حالة المستخدم
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
            currentUserData = { uid: user.uid, ...userDocSnap.data() };
            authSection.classList.add('d-none');
            dashboardSection.classList.remove('d-none');
            document.getElementById('logoutBtn').classList.remove('d-none');
            
            // تحديث الشريط العلوي
            document.getElementById('userProfileBadge').classList.remove('d-none');
            document.getElementById('navUserName').innerText = currentUserData.name;
            if(currentUserData.photoURL) document.getElementById('navUserImage').src = currentUserData.photoURL;
            
            if (currentUserData.role === 'admin') document.getElementById('adminLink').classList.remove('d-none');
            else document.getElementById('adminLink').classList.add('d-none');

            listenToKhatmas();
        }
    } else {
        authSection.classList.remove('d-none');
        dashboardSection.classList.add('d-none');
        document.getElementById('logoutBtn').classList.add('d-none');
        document.getElementById('adminLink').classList.add('d-none');
        document.getElementById('userProfileBadge').classList.add('d-none');
        currentUserData = null;
    }
});

// جلب الإعدادات (شريط الأخبار)
onSnapshot(doc(db, "settings", "general"), (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('newsText').innerText = data.newsTickerText;
        if (data.isTickerActive) document.getElementById('newsTickerContainer').classList.remove('d-none');
        else document.getElementById('newsTickerContainer').classList.add('d-none');
    }
});

// عرض الختمات
function listenToKhatmas() {
    const q = query(collection(db, "khatmas"), where("status", "==", "open"));
    onSnapshot(q, (snapshot) => {
        const container = document.getElementById('khatmasContainer');
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<div class="alert alert-info w-100 text-center">لا توجد ختمات مفتوحة حالياً.</div>';
            return;
        }

        snapshot.forEach((khatmaDoc) => {
            const khatma = khatmaDoc.data();
            const khatmaId = khatmaDoc.id;
            
            const card = document.createElement('div');
            card.className = "col-12 mb-4";
            
            let partsHTML = '<div class="d-flex flex-wrap gap-2 justify-content-center mt-3">';
            khatma.parts.forEach(part => {
                let btnClass = "btn-outline-success part-btn"; 
                let btnContent = `<span>الجزء ${part.partNumber}</span>`;
                let onClick = `onclick="window.requestPart('${khatmaId}', '${khatma.title}', ${part.partNumber})"`;
                let disabled = "";

                if (part.status === "pending") {
                    btnClass = "btn-warning text-dark part-btn"; 
                    btnContent = `<span>الجزء ${part.partNumber}</span><small>مراجعة</small>`;
                    disabled = "disabled"; onClick = "";
                } else if (part.status === "booked") {
                    btnClass = "btn-secondary text-white part-btn"; 
                    btnContent = `<span>الجزء ${part.partNumber}</span><img src="${part.userPhoto || 'https://via.placeholder.com/30'}" class="user-avatar-btn" title="${part.userName}">`;
                    disabled = "disabled"; onClick = "";
                }

                partsHTML += `<button class="btn ${btnClass} p-2" style="width: 85px;" ${onClick} ${disabled}>${btnContent}</button>`;
            });
            partsHTML += '</div>';

            card.innerHTML = `<div class="card shadow rounded-4 border-0 p-3"><h4 class="text-center fw-bold text-primary">${khatma.title}</h4>${partsHTML}</div>`;
            container.appendChild(card);
        });
    });
}

// طلب الحجز
window.requestPart = async (khatmaId, khatmaTitle, partNumber) => {
    Swal.fire({
        title: `حجز الجزء ${partNumber}؟`, text: `هل أنت متأكد من الحجز؟`, icon: 'question', showCancelButton: true, confirmButtonText: 'نعم', cancelButtonText: 'إلغاء'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                await addDoc(collection(db, "requests"), {
                    khatmaId: khatmaId, khatmaTitle: khatmaTitle, partNumber: partNumber,
                    userId: currentUserData.uid, userName: currentUserData.name, userPhoto: currentUserData.photoURL || '',
                    status: "pending", timestamp: new Date()
                });

                const khatmaRef = doc(db, "khatmas", khatmaId);
                const khatmaSnap = await getDoc(khatmaRef);
                let parts = khatmaSnap.data().parts;
                parts[partNumber - 1].status = "pending";
                await updateDoc(khatmaRef, { parts: parts });

                Swal.fire('تم', 'تم إرسال طلبك للأدمن.', 'success');
            } catch (error) { Swal.fire('خطأ', error.message, 'error'); }
        }
    });
};
