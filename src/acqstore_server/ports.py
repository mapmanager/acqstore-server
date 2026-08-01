"""Localhost port inspection and reclaim for AcqStore Server.

Only intended for the ports we own (API ``8767``, status UI ``8766`` by default).
Never kill the current process.
"""

from __future__ import annotations

import os
import platform
import signal
import subprocess
import time
from dataclasses import dataclass

from acqstore_server.logging_setup import get_logger

logger = get_logger('ports')


class PortReclaimError(Exception):
    """Failed to inspect or free a local TCP listen port."""


@dataclass(frozen=True)
class PortListener:
    """A process listening on a TCP port."""

    pid: int
    port: int


def list_listening_pids(port: int) -> list[int]:
    """Return PIDs with a TCP LISTEN socket on ``port`` (localhost tooling).

    Args:
        port: TCP port number.

    Returns:
        Distinct PIDs, possibly empty.

    Raises:
        PortReclaimError: If the OS lookup tool fails unexpectedly.
    """
    port = int(port)
    system = platform.system()
    if system in {'Darwin', 'Linux'}:
        return _list_pids_lsof(port)
    if system == 'Windows':
        return _list_pids_windows(port)
    raise PortReclaimError(f'Port reclaim unsupported on platform={system!r}')


def reclaim_port(
    port: int,
    *,
    exclude_pids: set[int] | None = None,
    settle_s: float = 0.4,
) -> list[int]:
    """Terminate foreign LISTEN processes on ``port``.

    Sends SIGTERM (or taskkill), waits briefly, then SIGKILL / force-kill for
    survivors. Never signals the current process.

    Args:
        port: TCP port to free.
        exclude_pids: Extra PIDs to leave alone (current pid always excluded).
        settle_s: Seconds to wait after TERM before force-kill / re-check.

    Returns:
        PIDs that were signaled (may include processes already exiting).

    Raises:
        PortReclaimError: If listeners remain after force-kill.
    """
    port = int(port)
    protected = {os.getpid()}
    if exclude_pids:
        protected.update(int(pid) for pid in exclude_pids)

    pids = [pid for pid in list_listening_pids(port) if pid not in protected]
    if not pids:
        logger.info('reclaim_port(%s): no foreign listeners', port)
        return []

    logger.warning('reclaim_port(%s): terminating pids=%s', port, pids)
    for pid in pids:
        _terminate_pid(pid, force=False)

    time.sleep(settle_s)
    remaining = [pid for pid in list_listening_pids(port) if pid not in protected]
    for pid in remaining:
        logger.warning('reclaim_port(%s): force-killing pid=%s', port, pid)
        _terminate_pid(pid, force=True)

    time.sleep(settle_s)
    leftover = [pid for pid in list_listening_pids(port) if pid not in protected]
    if leftover:
        raise PortReclaimError(
            f'Port {port} still has listeners after reclaim: pids={leftover}'
        )
    return pids


def _list_pids_lsof(port: int) -> list[int]:
    try:
        completed = subprocess.run(
            ['lsof', '-nP', f'-iTCP:{port}', '-sTCP:LISTEN', '-t'],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
    except FileNotFoundError as exc:
        raise PortReclaimError('lsof not found; cannot inspect listen ports') from exc
    except subprocess.TimeoutExpired as exc:
        raise PortReclaimError('lsof timed out') from exc

    # lsof exits 1 when there are no matches.
    if completed.returncode not in {0, 1}:
        err = (completed.stderr or completed.stdout or '').strip()
        raise PortReclaimError(f'lsof failed (code={completed.returncode}): {err}')

    pids: list[int] = []
    for line in completed.stdout.splitlines():
        text = line.strip()
        if not text:
            continue
        try:
            pids.append(int(text))
        except ValueError:
            continue
    return sorted(set(pids))


def _list_pids_windows(port: int) -> list[int]:
    try:
        completed = subprocess.run(
            ['netstat', '-ano', '-p', 'tcp'],
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except FileNotFoundError as exc:
        raise PortReclaimError('netstat not found; cannot inspect listen ports') from exc
    except subprocess.TimeoutExpired as exc:
        raise PortReclaimError('netstat timed out') from exc

    if completed.returncode != 0:
        err = (completed.stderr or completed.stdout or '').strip()
        raise PortReclaimError(f'netstat failed (code={completed.returncode}): {err}')

    needle = f':{port}'
    pids: list[int] = []
    for line in completed.stdout.splitlines():
        parts = line.split()
        # Proto  Local Address  Foreign Address  State  PID
        if len(parts) < 5:
            continue
        if parts[0].upper() not in {'TCP', 'TCPV6'}:
            continue
        local = parts[1]
        state = parts[3].upper()
        if state != 'LISTEN':
            # Some locales use LISTENING
            if state != 'LISTENING':
                continue
        if not (local.endswith(needle) or local.endswith(f']{needle}')):
            continue
        try:
            pids.append(int(parts[-1]))
        except ValueError:
            continue
    return sorted(set(pids))


def _terminate_pid(pid: int, *, force: bool) -> None:
    if pid == os.getpid():
        return
    system = platform.system()
    if system == 'Windows':
        args = ['taskkill', '/PID', str(pid)]
        if force:
            args.append('/F')
        subprocess.run(args, check=False, capture_output=True, text=True, timeout=10)
        return
    sig = signal.SIGKILL if force else signal.SIGTERM
    try:
        os.kill(pid, sig)
    except ProcessLookupError:
        return
    except PermissionError as exc:
        raise PortReclaimError(f'Permission denied signaling pid={pid}') from exc
