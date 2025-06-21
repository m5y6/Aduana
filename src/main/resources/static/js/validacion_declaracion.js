document.addEventListener('DOMContentLoaded', function() {
    if (!localStorage.getItem('jwt')) {
        window.location.href = '/login.html';
        return;
    }
    document.getElementById('enlaces-sesion').style.display = 'inline';
    document.getElementById('btn-cerrar-sesion').onclick = function() {
        localStorage.removeItem('jwt');
        window.location.href = '/index.html';
    };
    const payload = JSON.parse(atob(localStorage.getItem('jwt').split('.')[1]));
    if (payload.rolId != 2 && payload.rolId != 1) {
        document.getElementById('contenido-validacion-declaracion').style.display = 'none';
        document.body.insertAdjacentHTML('beforeend', '<p style="color:red">Acceso solo para inspectores o administradores.</p>');
        return;
    }
    cargarTramites();

    document.getElementById('btn-aceptar').onclick = function() {
        actualizarEstado('ACEPTADO');
    };
    document.getElementById('btn-rechazar').onclick = function() {
        actualizarEstado('RECHAZADO');
    };
});

let tramitesCache = [];
let idsValidos = [];

function renderTabla(tramites) {
    const div = document.getElementById('tramites-declaracion');
    if (!tramites.length) {
        div.innerHTML = '<p>No hay declaraciones SAG registradas.</p>';
        idsValidos = [];
        return;
    }
    idsValidos = tramites.map(t => t.id);
    let html = '<table><tr><th>ID</th><th>Descripción</th><th>Usuario</th><th>Fecha</th><th>Estado</th></tr>';
    tramites.forEach(t => {
        html += `<tr><td>${t.id}</td><td>${t.descripcion}</td><td>${t.usuario?.nombre || t.usuario?.id}</td><td>${t.fechaCreacion || ''}</td><td>${t.estado || 'PENDIENTE'}</td></tr>`;
    });
    html += '</table>';
    div.innerHTML = html;
}

function cargarTramites() {
    fetch('/api/v1/tramites/tipo/3', {
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwt') }
    })
    .then(r => r.json())
    .then(tramites => {
        tramitesCache = tramites;
        renderTabla(tramitesCache);
    })
    .catch(() => {
        document.getElementById('tramites-declaracion').innerHTML = '<p style="color:red">Error al cargar las declaraciones.</p>';
    });
}

function actualizarEstado(nuevoEstado) {
    const id = document.getElementById('accion-id').value.trim();
    const resultado = document.getElementById('accion-resultado');
    if (!id || !idsValidos.includes(Number(id))) {
        resultado.style.color = 'red';
        resultado.textContent = 'Ingrese una ID válida que esté en la tabla.';
        return;
    }
    fetch(`/api/v1/tramites/${id}/estado`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('jwt')
        },
        body: JSON.stringify({ estado: nuevoEstado })
    })
    .then(async r => {
        if (r.ok) {
            resultado.style.color = 'green';
            resultado.textContent = `Estado actualizado a ${nuevoEstado}`;
            cargarTramites();
        } else if (r.status === 404) {
            resultado.style.color = 'red';
            resultado.textContent = 'ID no encontrada en la base de datos.';
        } else if (r.status === 400) {
            const msg = await r.text();
            resultado.style.color = 'red';
            resultado.textContent = msg || 'Estado inválido.';
        } else {
            const msg = await r.text();
            resultado.style.color = 'red';
            resultado.textContent = msg || 'Error al actualizar el estado.';
        }
    })
    .catch(() => {
        resultado.style.color = 'red';
        resultado.textContent = 'Error de red al actualizar el estado.';
    });
}
