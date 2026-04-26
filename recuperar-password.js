import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'TU_SUPABASE_URL'; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY'; // Reemplaza con tu Key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- ELEMENTOS DOM ---
const steps = {
    email: document.getElementById('step-email'),
    sent: document.getElementById('step-sent'),
    reset: document.getElementById('step-reset'),
    error: document.getElementById('step-error')
};

const forms = {
    email: document.getElementById('form-email'),
    reset: document.getElementById('form-reset')
};

const displays = {
    username: document.getElementById('display-username'),
    errorEmail: document.getElementById('error-email'),
    errorReset: document.getElementById('error-reset'),
    successReset: document.getElementById('success-reset'),
    errorMsgGeneral: document.getElementById('error-message-text')
};

const buttons = {
    send: document.getElementById('btn-send'),
    reset: document.getElementById('btn-reset')
};

const spinners = {
    send: document.getElementById('spinner-send'),
    reset: document.getElementById('spinner-reset')
};

// --- ESTADO INICIAL ---
let targetUsername = null;
let recoveryToken = null;

async function init() {
    const params = new URLSearchParams(window.location.search);
    recoveryToken = params.get('token');
    targetUsername = params.get('usuario'); // Obtenemos el usuario desde la URL

    // 1. Si NO hay token, mostramos formulario de email
    if (!recoveryToken) {
        if (!targetUsername) {
            showError("Error: No se especificó ningún usuario. Por favor inicia el proceso desde el login.");
            return;
        }
        
        displays.username.textContent = targetUsername;
        showStep('email');
    } 
    // 2. Si HAY token, validamos y mostramos formulario de nueva contraseña
    else {
        showStep('loading'); // Estado intermedio opcional si quisieras
        await validateToken(recoveryToken);
    }
}

// --- FUNCIONES DE UTILIDAD ---
function showStep(stepName) {
    Object.values(steps).forEach(el => el.classList.add('hidden'));
    if (stepName !== 'loading' && steps[stepName]) {
        steps[stepName].classList.remove('hidden');
    }
}

function setLoading(isLoading, type) {
    const btn = type === 'send' ? buttons.send : buttons.reset;
    const spinner = type === 'send' ? spinners.send : spinners.reset;
    const textSpan = btn.querySelector('.btn-text');

    if (isLoading) {
        btn.disabled = true;
        textSpan.style.display = 'none';
        spinner.style.display = 'block';
    } else {
        btn.disabled = false;
        textSpan.style.display = 'block';
        spinner.style.display = 'none';
    }
}

function showError(msg, type = 'email') {
    if (type === 'general') {
        displays.errorMsgGeneral.textContent = msg;
        showStep('error');
    } else if (type === 'reset') {
        displays.errorReset.textContent = msg;
        setTimeout(() => displays.errorReset.textContent = '', 5000);
    } else {
        displays.errorEmail.textContent = msg;
        setTimeout(() => displays.errorEmail.textContent = '', 5000);
    }
}

// --- LÓGICA PRINCIPAL ---

// 1. Solicitar Token (Validar Email)
forms.email.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('email').value.trim();
    
    if (!emailInput) return showError("Ingresa un correo", 'email');
    
    setLoading(true, 'send');
    displays.errorEmail.textContent = '';

    try {
        // A. Verificar que el email coincide con el usuario seleccionado
        const { data: user, error: userError } = await supabase
            .from('usuarios')
            .select('id, email_recuperacion')
            .eq('username', targetUsername)
            .single();

        if (userError || !user) {
            throw new Error("Usuario no encontrado");
        }

        // B. Validar coincidencia de email (Case insensitive básico)
        if (user.email_recuperacion?.toLowerCase() !== emailInput.toLowerCase()) {
            throw new Error("El correo no coincide con el usuario seleccionado.");
        }

        // C. Llamar a la función RPC para generar token y enviar email
        // Asumimos que creaste la función 'solicitar_recuperacion' en SQL
        const { error: rpcError } = await supabase.rpc('solicitar_recuperacion', {
            p_username: targetUsername,
            p_email: emailInput
        });

        if (rpcError) throw rpcError;

        // D. Éxito
        showStep('sent');

    } catch (err) {
        console.error(err);
        showError(err.message || "Error al procesar la solicitud", 'email');
    } finally {
        setLoading(false, 'send');
    }
});

// 2. Validar Token (Al cargar con ?token=XYZ)
async function validateToken(token) {
    try {
        // Llamada RPC para validar token y obtener info del usuario
        // Esta función debe devolver el usuario_id si es válido
        const { data, error } = await supabase.rpc('validar_token_recuperacion', {
            p_token: token
        });

        if (error || !data) {
            throw new Error("Token inválido o expirado");
        }

        // Token válido, mostrar formulario de reset
        showStep('reset');

    } catch (err) {
        console.error(err);
        showError(err.message || "Enlace inválido", 'general');
    }
}

// 3. Resetear Contraseña
forms.reset.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass1 = document.getElementById('new-password').value;
    const pass2 = document.getElementById('confirm-password').value;

    if (pass1 !== pass2) return showError("Las contraseñas no coinciden", 'reset');
    if (pass1.length < 6) return showError("Mínimo 6 caracteres", 'reset');

    setLoading(true, 'reset');
    displays.errorReset.textContent = '';

    try {
        // Llamada RPC para actualizar contraseña y marcar token como usado (opcional)
        const { error } = await supabase.rpc('actualizar_password_con_token', {
            p_token: recoveryToken,
            p_nueva_password: pass1
        });

        if (error) throw error;

        displays.successReset.textContent = "¡Contraseña actualizada! Redirigiendo...";
        
        setTimeout(() => {
            window.location.href = 'index.html'; // O donde tengas el login
        }, 2000);

    } catch (err) {
        console.error(err);
        showError(err.message || "Error al actualizar contraseña", 'reset');
    } finally {
        setLoading(false, 'reset');
    }
});

// Iniciar app
init();
