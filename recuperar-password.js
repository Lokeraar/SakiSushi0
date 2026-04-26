/**
 * RECUPERAR-PASSWORD.JS
 * Sistema de recuperación de contraseña personalizado para Saki Sushi
 * 
 * Características:
 * - Permite emails compartidos en email_recuperacion
 * - Tokens únicos con expiración de 1 hora
 * - Uso reiterado permitido por 10 minutos
 * - Envío de emails vía EmailJS o servicio SMTP propio
 */

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    // Supabase
    SUPABASE_URL: 'https://iqwwoihiiyrtypyqzhgy.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxd3dvaWhpaXlydGlweXF6aGd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MTQ1NzEsImV4cCI6MjA1MjM5MDU3MX0.FWbVfSzWiKqk7dhOGFAWR28CnBZhUXHlxEU3k6uLz_E',
    
    // EmailJS (opcional - si usas servicio externo)
    EMAILJS_PUBLIC_KEY: '', // Tu public key de EmailJS
    EMAILJS_SERVICE_ID: '', // Tu service ID de EmailJS
    EMAILJS_TEMPLATE_ID: '', // Tu template ID de EmailJS
    
    // URL base para enlaces de recuperación
    BASE_URL: window.location.origin,
    RECOVERY_PAGE_PATH: '/recuperar-password.html',
    
    // Tiempos
    TOKEN_EXPIRY_HOURS: 1,
    TOKEN_REUSE_WINDOW_MINUTES: 10
};

// ============================================
// INICIALIZACIÓN DE SUPABASE
// ============================================
let supabase;

function inicializarSupabase() {
    if (!supabase) {
        supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    }
    return supabase;
}

// ============================================
// ESTADO GLOBAL
// ============================================
let estado = {
    usuarioSeleccionado: null,
    tokenValido: null,
    modo: 'recuperacion' // 'recuperacion' o 'cambio_con_token'
};

// ============================================
// UTILIDADES
// ============================================
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('i');
    
    toast.className = `toast ${tipo}`;
    toastMessage.textContent = mensaje;
    
    // Icono según tipo
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    toastIcon.className = `fas ${iconos[tipo] || iconos.info}`;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

function mostrarSeccion(seccionId) {
    document.querySelectorAll('.form-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(seccionId).classList.add('active');
}

function volverAtras(seccionId) {
    mostrarSeccion(seccionId);
}

function validarPassword(password) {
    const hints = {
        length: password.length >= 6,
        number: /\d/.test(password),
        letter: /[a-zA-Z]/.test(password)
    };
    
    // Actualizar UI
    Object.keys(hints).forEach(key => {
        const hint = document.getElementById(`hint-${key}`);
        if (hint) {
            hint.classList.toggle('valid', hints[key]);
            hint.querySelector('i').className = hints[key] ? 'fas fa-check-circle' : 'far fa-circle';
        }
    });
    
    // Barra de fuerza
    const strengthBar = document.getElementById('strengthBar');
    const puntaje = Object.values(hints).filter(v => v).length;
    
    strengthBar.className = 'password-strength-bar';
    if (puntaje === 1) strengthBar.classList.add('weak');
    else if (puntaje === 2) strengthBar.classList.add('medium');
    else if (puntaje === 3) strengthBar.classList.add('strong');
    
    return Object.values(hints).every(v => v);
}

// ============================================
// FUNCIONES DE BASE DE DATOS
// ============================================

/**
 * Verificar si un email de recuperación existe y obtener usuarios asociados
 */
async function verificarEmailRecuperacion(email) {
    try {
        const { data, error } = await supabase.rpc('verificar_email_recuperacion', {
            p_email: email
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const resultado = data[0];
            if (resultado.success && resultado.usuarios) {
                return {
                    success: true,
                    usuarios: resultado.usuarios
                };
            }
        }
        
        return { success: false, error: 'No se encontró ningún usuario con este email' };
    } catch (error) {
        console.error('Error verificando email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Generar token de recuperación para un usuario
 */
async function generarTokenRecuperacion(usuarioId, email) {
    try {
        const { data, error } = await supabase.rpc('generar_token_recuperacion', {
            p_usuario_id: usuarioId,
            p_email: email,
            p_ip_origen: null,
            p_user_agent: navigator.userAgent
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const resultado = data[0];
            if (resultado.success) {
                return {
                    success: true,
                    token: resultado.token,
                    expiraEn: resultado.expira_en
                };
            }
            return { success: false, error: resultado.error };
        }
        
        return { success: false, error: 'No se pudo generar el token' };
    } catch (error) {
        console.error('Error generando token:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Validar token de recuperación
 */
async function validarToken(token) {
    try {
        const { data, error } = await supabase.rpc('validar_token_recuperacion', {
            p_token: token
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const resultado = data[0];
            return {
                success: resultado.success,
                error: resultado.error,
                usuario: resultado.success ? {
                    id: resultado.usuario_id,
                    username: resultado.username,
                    nombre: resultado.nombre,
                    email: resultado.email
                } : null,
                puedeUsarse: resultado.puede_usarse
            };
        }
        
        return { success: false, error: 'Token inválido' };
    } catch (error) {
        console.error('Error validando token:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Actualizar contraseña usando token
 */
async function actualizarContrasena(token, nuevaPassword) {
    try {
        const { data, error } = await supabase.rpc('actualizar_contrasena_con_token', {
            p_token: token,
            p_nueva_password: nuevaPassword
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            const resultado = data[0];
            return {
                success: resultado.success,
                error: resultado.error,
                usuarioId: resultado.usuario_id
            };
        }
        
        return { success: false, error: 'No se pudo actualizar la contraseña' };
    } catch (error) {
        console.error('Error actualizando contraseña:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obtener todos los usuarios activos para selección
 */
async function obtenerUsuariosActivos() {
    try {
        console.log('[DEBUG] Consultando usuarios activos en Supabase...');
        
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nombre, username, rol, activo')
            .eq('activo', true)
            .order('nombre');

        if (error) {
            console.error('[ERROR] Error en consulta:', error);
            throw error;
        }
        
        console.log('[DEBUG] Usuarios encontrados:', data ? data.length : 0);
        
        return { success: true, usuarios: data || [] };
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        return { success: false, error: error.message, usuarios: [] };
    }
}

// ============================================
// ENVÍO DE EMAILS
// ============================================

/**
 * Enviar email de recuperación usando EmailJS (servicio externo)
 * Configura tu cuenta en https://www.emailjs.com/
 */
async function enviarEmailEmailJS(destinatario, token, username) {
    // Verificar si EmailJS está configurado
    if (!CONFIG.EMAILJS_PUBLIC_KEY) {
        console.warn('EmailJS no configurado. Usando método alternativo.');
        return await enviarEmailAlternativo(destinatario, token, username);
    }
    
    // Cargar EmailJS dinámicamente si no está cargado
    if (!window.emailjs) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        
        window.emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);
    }
    
    const enlaceRecuperacion = `${CONFIG.BASE_URL}${CONFIG.RECOVERY_PAGE_PATH}?token=${token}`;
    
    try {
        const resultado = await emailjs.send(
            CONFIG.EMAILJS_SERVICE_ID,
            CONFIG.EMAILJS_TEMPLATE_ID,
            {
                to_email: destinatario,
                username: username,
                recovery_link: enlaceRecuperacion,
                expiry_hours: CONFIG.TOKEN_EXPIRY_HOURS
            }
        );
        
        return { success: true, resultado };
    } catch (error) {
        console.error('Error enviando email con EmailJS:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Método alternativo: Usar Edge Function de Supabase para enviar email
 * O usar un servicio SMTP propio
 */
async function enviarEmailAlternativo(destinatario, token, username) {
    const enlaceRecuperacion = `${CONFIG.BASE_URL}${CONFIG.RECOVERY_PAGE_PATH}?token=${token}`;
    
    // Opción 1: Llamar a una Edge Function de Supabase
    try {
        const response = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/enviar-email-recuperacion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                destinatario: destinatario,
                token: token,
                username: username,
                enlace: enlaceRecuperacion
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            return { success: true, data };
        }
    } catch (error) {
        console.log('Edge Function no disponible, mostrando enlace manualmente');
    }
    
    // Opción 2: Mostrar el enlace al usuario (para desarrollo/testing)
    console.log('='.repeat(50));
    console.log('ENLACE DE RECUPERACIÓN (para testing):');
    console.log(enlaceRecuperacion);
    console.log('='.repeat(50));
    
    // En producción, aquí iría la llamada a tu servicio SMTP
    mostrarToast(
        'Para testing, revisa la consola para el enlace de recuperación',
        'info'
    );
    
    return { 
        success: true, 
        mensaje: 'Enlace generado (revisa consola para testing)',
        enlace: enlaceRecuperacion
    };
}

/**
 * Función principal para enviar email de recuperación
 */
async function enviarEmailRecuperacion(destinatario, token, username) {
    // Intentar con EmailJS primero
    let resultado = await enviarEmailEmailJS(destinatario, token, username);
    
    if (!resultado.success) {
        // Fallback a método alternativo
        resultado = await enviarEmailAlternativo(destinatario, token, username);
    }
    
    return resultado;
}

// ============================================
// MANEJO DEL FLujo DE RECUPERACIÓN
// ============================================

/**
 * Inicializar página cuando viene del login (selección de usuario)
 */
async function iniciarFlujoRecuperacion() {
    console.log('[DEBUG] Iniciando flujo de recuperación...');
    
    try {
        const btnContinuar = document.getElementById('btnContinueToEmail');
        const userList = document.getElementById('userList');
        
        if (!userList) {
            console.error('[ERROR] Elemento userList no encontrado');
            return;
        }

        // Mostrar loading
        userList.innerHTML = '<div style="text-align:center;padding:20px;"><div class="loading-spinner"></div><p style="margin-top:10px;color:var(--text-secondary);">Cargando usuarios...</p></div>';
        
        console.log('[DEBUG] Obteniendo usuarios activos...');
        
        // Obtener usuarios
        const resultado = await obtenerUsuariosActivos();
        
        console.log('[DEBUG] Resultado:', resultado);
        
        if (!resultado.success || !resultado.usuarios.length) {
            console.warn('[WARNING] No hay usuarios disponibles:', resultado);
            userList.innerHTML = '<p style="text-align:center;color:var(--danger);">No hay usuarios disponibles.<br><small>Verifica que existan usuarios en la tabla "usuarios"</small></p>';
            return;
        }
        
        // Renderizar lista de usuarios
        userList.innerHTML = resultado.usuarios.map(usuario => `
            <div class="user-option" data-id="${usuario.id}" data-username="${usuario.username}" data-nombre="${usuario.nombre}">
                <i class="fas fa-user-circle"></i>
                <div class="user-option-info">
                    <div class="user-option-name">${usuario.nombre}</div>
                    <div class="user-option-username">@${usuario.username} • ${usuario.rol}</div>
                </div>
            </div>
        `).join('');
        
        // Agregar eventos de selección
        document.querySelectorAll('.user-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.user-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                
                estado.usuarioSeleccionado = {
                    id: option.dataset.id,
                    username: option.dataset.username,
                    nombre: option.dataset.nombre
                };
                
                btnContinuar.disabled = false;
            });
        });
        
        // Evento botón continuar
        btnContinuar.addEventListener('click', () => {
            if (!estado.usuarioSeleccionado) return;
            
            document.getElementById('userInfoText').textContent = 
                `${estado.usuarioSeleccionado.nombre} (@${estado.usuarioSeleccionado.username})`;
            
            mostrarSeccion('section-email');
        });
        
    } catch (error) {
        console.error('Error iniciando flujo:', error);
        mostrarToast('Error al cargar usuarios', 'error');
    }
}

/**
 * Manejar formulario de envío de email
 */
async function manejarEnvioEmail(e) {
    e.preventDefault();
    
    const emailInput = document.getElementById('recoveryEmail');
    const btnSend = document.getElementById('btnSendToken');
    const email = emailInput.value.trim().toLowerCase();
    
    if (!email) {
        mostrarToast('Ingresa un email de recuperación', 'error');
        return;
    }
    
    if (!estado.usuarioSeleccionado) {
        mostrarToast('Selecciona un usuario primero', 'error');
        return;
    }
    
    // Deshabilitar botón
    btnSend.disabled = true;
    btnSend.innerHTML = '<div class="loading-spinner"></div> Enviando...';
    
    try {
        // Verificar que el email coincide con el del usuario
        const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select('email_recuperacion')
            .eq('id', estado.usuarioSeleccionado.id)
            .single();
        
        if (userError) throw userError;
        
        if (!userData || userData.email_recuperacion?.toLowerCase() !== email) {
            mostrarToast('El email no coincide con el registrado para este usuario', 'error');
            btnSend.disabled = false;
            btnSend.innerHTML = '<span>Enviar Enlace de Recuperación</span><i class="fas fa-paper-plane"></i>';
            return;
        }
        
        // Generar token
        const tokenResultado = await generarTokenRecuperacion(estado.usuarioSeleccionado.id, email);
        
        if (!tokenResultado.success) {
            throw new Error(tokenResultado.error || 'No se pudo generar el token');
        }
        
        // Enviar email
        const emailResultado = await enviarEmailRecuperacion(
            email,
            tokenResultado.token,
            estado.usuarioSeleccionado.username
        );
        
        if (!emailResultado.success) {
            throw new Error(emailResultado.error || 'No se pudo enviar el email');
        }
        
        // Mostrar confirmación
        mostrarSeccion('section-sent');
        mostrarToast('Enlace de recuperación enviado', 'success');
        
    } catch (error) {
        console.error('Error en envío:', error);
        mostrarToast(error.message || 'Error al enviar enlace de recuperación', 'error');
        btnSend.disabled = false;
        btnSend.innerHTML = '<span>Enviar Enlace de Recuperación</span><i class="fas fa-paper-plane"></i>';
    }
}

/**
 * Inicializar página cuando viene con token (desde email)
 */
async function iniciarFlujoConToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (!token) {
        // No hay token, mostrar flujo normal de recuperación
        estado.modo = 'recuperacion';
        mostrarSeccion('section-user-select');
        await iniciarFlujoRecuperacion();
        return;
    }
    
    // Hay token, validar
    estado.modo = 'cambio_con_token';
    estado.tokenValido = token;
    
    mostrarSeccion('section-new-password');
    
    const tokenValidation = document.getElementById('tokenValidation');
    
    try {
        const resultado = await validarToken(token);
        
        if (!resultado.success || !resultado.puedeUsarse) {
            tokenValidation.className = 'alert alert-error show';
            tokenValidation.innerHTML = `<i class="fas fa-times-circle"></i><span>${resultado.error || 'Token inválido'}</span>`;
            
            setTimeout(() => {
                mostrarSeccion('section-token-error');
                document.getElementById('tokenErrorMessage').textContent = resultado.error || 'Token inválido o expirado';
            }, 2000);
            return;
        }
        
        // Token válido
        tokenValidation.className = 'alert alert-success show';
        tokenValidation.innerHTML = '<i class="fas fa-check-circle"></i><span>Token válido</span>';
        
        // Mostrar información del usuario
        document.getElementById('userNameDisplay').textContent = resultado.usuario.nombre;
        
        // Mostrar formulario
        document.getElementById('passwordForm').classList.remove('hidden');
        
        // Configurar validación de password en tiempo real
        configurarValidacionPassword();
        
    } catch (error) {
        console.error('Error validando token:', error);
        tokenValidation.className = 'alert alert-error show';
        tokenValidation.innerHTML = '<i class="fas fa-times-circle"></i><span>Error de validación</span>';
        
        setTimeout(() => {
            mostrarSeccion('section-token-error');
        }, 2000);
    }
}

/**
 * Configurar validación de password en tiempo real
 */
function configurarValidacionPassword() {
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const matchError = document.getElementById('passwordMatchError');
    
    newPasswordInput.addEventListener('input', () => {
        validarPassword(newPasswordInput.value);
        verificarCoincidencia();
    });
    
    confirmPasswordInput.addEventListener('input', verificarCoincidencia);
    
    function verificarCoincidencia() {
        const pass1 = newPasswordInput.value;
        const pass2 = confirmPasswordInput.value;
        
        if (pass2 && pass1 !== pass2) {
            matchError.style.display = 'flex';
        } else {
            matchError.style.display = 'none';
        }
    }
}

/**
 * Manejar formulario de nueva contraseña
 */
async function manejarNuevaContrasena(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btnUpdate = document.getElementById('btnUpdatePassword');
    
    // Validaciones
    if (!validarPassword(newPassword)) {
        mostrarToast('La contraseña no cumple los requisitos mínimos', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        mostrarToast('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        mostrarToast('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    // Deshabilitar botón
    btnUpdate.disabled = true;
    btnUpdate.innerHTML = '<div class="loading-spinner"></div> Actualizando...';
    
    try {
        const resultado = await actualizarContrasena(estado.tokenValido, newPassword);
        
        if (!resultado.success) {
            throw new Error(resultado.error || 'No se pudo actualizar la contraseña');
        }
        
        // Éxito
        document.getElementById('passwordForm').classList.add('hidden');
        document.getElementById('tokenValidation').classList.add('hidden');
        document.getElementById('passwordSuccess').classList.remove('hidden');
        
        mostrarToast('Contraseña actualizada exitosamente', 'success');
        
    } catch (error) {
        console.error('Error actualizando contraseña:', error);
        mostrarToast(error.message || 'Error al actualizar contraseña', 'error');
        btnUpdate.disabled = false;
        btnUpdate.innerHTML = '<span>Actualizar Contraseña</span><i class="fas fa-save"></i>';
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('[DEBUG] DOMContentLoaded - Iniciando aplicación...');
//     // Inicializar Supabase
//     supabase = inicializarSupabase();
//     console.log('[DEBUG] Supabase inicializado:', !!supabase);
//     
//     // Configurar formularios
//     const emailForm = document.getElementById('emailForm');
//     const passwordForm = document.getElementById('passwordForm');
//     console.log('[DEBUG] emailForm:', !!emailForm);
//     console.log('[DEBUG] passwordForm:', !!passwordForm);
//     
//     if (emailForm) {
//         emailForm.addEventListener('submit', manejarEnvioEmail);
//     }
//     
//     if (passwordForm) {
//         passwordForm.addEventListener('submit', manejarNuevaContrasena);
//     }
//     
//     console.log('[DEBUG] Llamando a iniciarFlujoConToken...');
//     
//     // Determinar qué flujo iniciar
//     iniciarFlujoConToken();
// });

// ============================================
// EXPORTAR FUNCIONES GLOBALES (para HTML)
// ============================================
window.volverAtras = volverAtras;
window.mostrarSeccion = mostrarSeccion;

// ============================================
// INICIALIZACIÓN CON MANEJO DE ERRORES
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] DOMContentLoaded - Iniciando aplicación...');
    
    try {
        // Inicializar Supabase
        supabase = inicializarSupabase();
        console.log('[DEBUG] Supabase inicializado:', !!supabase);
        
        // Configurar formularios
        const emailForm = document.getElementById('emailForm');
        const passwordForm = document.getElementById('passwordForm');
        console.log('[DEBUG] emailForm:', !!emailForm);
        console.log('[DEBUG] passwordForm:', !!passwordForm);
        
        if (emailForm) {
            emailForm.addEventListener('submit', manejarEnvioEmail);
        }
        
        if (passwordForm) {
            passwordForm.addEventListener('submit', manejarNuevaContrasena);
        }
        
        console.log('[DEBUG] Llamando a iniciarFlujoConToken...');
        
        // Determinar qué flujo iniciar
        iniciarFlujoConToken();
    } catch (error) {
        console.error('[ERROR CRÍTICO] Error en inicialización:', error);
        document.body.innerHTML = '<div style="color: #ef4444; padding: 20px; text-align: center;"><h2>Error al cargar la página</h2><p>' + error.message + '</p><p>Por favor, recarga la página o contacta al administrador.</p></div>';
    }
});
